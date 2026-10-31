<?php

require_once __DIR__ . '/../Repositories/CartRepository.php';
require_once __DIR__ . '/../Repositories/ProductRepository.php';

final class CartController
{
    private CartRepository $cartRepository;
    private ProductRepository $productRepository;
    private PDO $db;

    // Initialize database and repositories
    public function __construct(PDO $db)
    {
        $this->db = $db;

        $this->cartRepository = new CartRepository($db);
        $this->productRepository = new ProductRepository($db);
    }

    /**
     * Recalculate live cart prices after mutations. Invalidated coupons are removed.
     * When the last item disappears, reset fees/gift settings and show a true $0 cart.
     * Caller already has a transaction open.
     */
    private function refreshOrderPricing(int $orderId): void
    {
        require_once __DIR__ . '/../services/OrderPricing.php';
        $lock = $this->db->prepare("SELECT id FROM orders WHERE id=? AND status='cart' FOR UPDATE");
        $lock->execute([$orderId]);
        if (!$lock->fetchColumn()) throw new RuntimeException('Active cart not found.');

        $count=$this->db->prepare('SELECT COUNT(*) FROM order_items WHERE order_id=?');
        $count->execute([$orderId]);
        if ((int) $count->fetchColumn()===0) {
            $this->db->prepare('DELETE FROM order_gift_details WHERE order_id=?')->execute([$orderId]);
            $this->db->prepare("UPDATE orders SET coupon_id=NULL, subtotal=0, discount_amount=0, shipping_fee=0, total_amount=0 WHERE id=? AND status='cart'")
                ->execute([$orderId]);
            return;
        }
        $stmt=$this->db->prepare('SELECT c.code FROM orders o LEFT JOIN coupons c ON c.id=o.coupon_id WHERE o.id=?');
        $stmt->execute([$orderId]);
        $coupon=$stmt->fetchColumn() ?: null;
        $pricing=new OrderPricing($this->db);
        try {
            $pricing->recalculate($orderId,$coupon);
        } catch (DomainException $e) {
            if (!$coupon) throw $e; // Inventory and product validation failures must not be ignored.
            $pricing->recalculate($orderId,null); // Expired/invalid coupon: clear and price correctly.
        }
    }

    // Get the user's cart and products
    public function getCart(int $userId): array
    {
        $cart = $this->cartRepository->getCartByUserId($userId);

        if (!$cart) {
            return [
                'cart' => null,
                'items' => [],
                'gift' => null
            ];
        }

        $items = $this->cartRepository->getCartItems(
            (int) $cart['id']
        );

        // Attach custom box configuration using existing custom_orders and gift_box_items.
        $getBuild = $this->db->prepare("SELECT prompt FROM custom_orders WHERE order_item_id=? AND prompt LIKE 'DONO_CUSTOM_BOX_V1:%' LIMIT 1");
        $getParts = $this->db->prepare(
            'SELECT g.product_id,g.quantity,g.unit_price,p.name FROM gift_box_items g
             JOIN products p ON p.id=g.product_id WHERE g.order_item_id=? ORDER BY g.id'
        );
        foreach ($items as &$row) {
            $getBuild->execute([(int)$row['order_item_id']]);
            $json = $getBuild->fetchColumn();
            if ($json !== false) {
                $getParts->execute([(int)$row['order_item_id']]);
                $row['custom_box'] = [
                    'configuration' => json_decode(substr((string)$json, strlen('DONO_CUSTOM_BOX_V1:')), true),
                    'components' => $getParts->fetchAll(PDO::FETCH_ASSOC),
                ];
            }
        }
        unset($row);
        $giftStmt = $this->db->prepare('SELECT recipient_name,recipient_phone,recipient_address,gift_message,hide_price,wrapping_type,wrapping_fee FROM order_gift_details WHERE order_id = ?');
        $giftStmt->execute([(int) $cart['id']]);
        return [
            'cart' => $cart,
            'items' => $items,
            'gift' => $giftStmt->fetch(PDO::FETCH_ASSOC) ?: null
        ];
    }

    // Add a product to the cart
    public function addToCart(
        int $userId,
        int $productId,
        int $quantity
    ): array {

        // Validate quantity
        if ($quantity <= 0) {
            return [
                'success' => false,
                'message' => 'Quantity must be greater than zero'
            ];
        }

        // Get product
        $product = $this->productRepository->getById($productId);

        // Check product availability
        if (!$product || (int) $product['is_active'] !== 1) {
            return [
                'success' => false,
                'message' => 'Product not available'
            ];
        }

        // Check stock
        if ($quantity > (int) $product['stock_quantity']) {
            return [
                'success' => false,
                'message' => 'Not enough stock'
            ];
        }

        try {
            // Start transaction
            $this->db->beginTransaction();

            // Get or create cart
            $cart = $this->cartRepository->getCartByUserId($userId);

            if ($cart) {
                $orderId = (int) $cart['id'];
            } else {
                $orderId = $this->cartRepository->createCart($userId);
            }

            // Check existing item
            $cartItem = $this->cartRepository->getCartItem(
                $orderId,
                $productId
            );

            if ($cartItem) {
                $isBuild = $this->db->prepare("SELECT 1 FROM custom_orders WHERE order_item_id=? AND prompt LIKE 'DONO_CUSTOM_BOX_V1:%'");
                $isBuild->execute([(int)$cartItem['id']]);
                if ($isBuild->fetchColumn()) {
                    $this->db->rollBack();
                    return ['success'=>false,'message'=>'This product belongs to a custom box. Remove that box before adding the same packaging product.'];
                }
            }

            if ($cartItem) {
                $newQuantity = (int) $cartItem['quantity'] + $quantity;
            } else {
                $newQuantity = $quantity;
            }

            // Check total quantity against stock
            if ($newQuantity > (int) $product['stock_quantity']) {
                $this->db->rollBack();

                return [
                    'success' => false,
                    'message' => 'Not enough stock'
                ];
            }

            if ($cartItem) {
                // Update existing item
                $saved = $this->cartRepository->updateCartItem(
                    $orderId,
                    $productId,
                    $newQuantity,
                    (float) $product['price']
                );
            } else {
                // Insert new item
                $saved = $this->cartRepository->addCartItem(
                    $orderId,
                    $productId,
                    $product['name'],
                    (float) $product['price'],
                    $quantity
                );
            }

            // Check save result
            if (!$saved) {
                throw new RuntimeException('Failed to save cart item');
            }

            // Update cart total
            $this->refreshOrderPricing($orderId);
            $totalUpdated = true;

            if (!$totalUpdated) {
                throw new RuntimeException('Failed to update cart total');
            }

            // Save changes
            $this->db->commit();

            return [
                'success' => true,
                'message' => 'Product added to cart',
                'order_id' => $orderId
            ];

        } catch (Throwable $e) {

            // Undo changes on error
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            return [
                'success' => false,
                'message' => 'Failed to add product to cart'
            ];
        }
    }

    // Update a product quantity in the cart
    public function updateCartQuantity(
        int $userId,
        int $productId,
        int $quantity
    ): array {

        // Validate quantity
        if ($quantity <= 0) {
            return [
                'success' => false,
                'message' => 'Quantity must be greater than zero'
            ];
        }

        // Get user's cart
        $cart = $this->cartRepository->getCartByUserId($userId);

        if (!$cart) {
            return [
                'success' => false,
                'message' => 'Cart not found'
            ];
        }

        $orderId = (int) $cart['id'];

        // Check existing item
        $cartItem = $this->cartRepository->getCartItem(
            $orderId,
            $productId
        );

        if (!$cartItem) {
            return [
                'success' => false,
                'message' => 'Product not found in cart'
            ];
        }

        {
            $checkBox = $this->db->prepare("SELECT 1 FROM custom_orders b JOIN order_items oi ON oi.id=b.order_item_id WHERE oi.order_id=? AND oi.product_id=? AND b.prompt LIKE 'DONO_CUSTOM_BOX_V1:%'");
            $checkBox->execute([$orderId,$productId]);
            if ($checkBox->fetchColumn()) return ['success'=>false,'message'=>'Custom boxes cannot change quantity. Remove the box to build another.'];
        }

        // Get product
        $product = $this->productRepository->getById($productId);

        // Check product availability
        if (!$product || (int) $product['is_active'] !== 1) {
            return [
                'success' => false,
                'message' => 'Product not available'
            ];
        }

        // Check stock
        if ($quantity > (int) $product['stock_quantity']) {
            return [
                'success' => false,
                'message' => 'Not enough stock'
            ];
        }

        try {
            // Start transaction
            $this->db->beginTransaction();

            // Update item quantity
            $saved = $this->cartRepository->updateCartItem(
                $orderId,
                $productId,
                $quantity,
                (float) $product['price']
            );

            if (!$saved) {
                throw new RuntimeException('Failed to update item');
            }

            // Update cart total
            $this->refreshOrderPricing($orderId);
            $totalUpdated = true;

            if (!$totalUpdated) {
                throw new RuntimeException('Failed to update total');
            }

            // Save changes
            $this->db->commit();

            return [
                'success' => true,
                'message' => 'Cart quantity updated'
            ];

        } catch (Throwable $e) {

            // Undo changes on error
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            return [
                'success' => false,
                'message' => 'Failed to update cart quantity'
            ];
        }
    }

    // Remove a product from the cart
    public function removeFromCart(
        int $userId,
        int $productId
    ): array {

        // Get user's cart
        $cart = $this->cartRepository->getCartByUserId($userId);

        if (!$cart) {
            return [
                'success' => false,
                'message' => 'Cart not found'
            ];
        }

        $orderId = (int) $cart['id'];

        try {
            // Start transaction
            $this->db->beginTransaction();

            // Remove cart item
            $removed = $this->cartRepository->removeCartItem(
                $orderId,
                $productId
            );

            if (!$removed) {
                $this->db->rollBack();

                return [
                    'success' => false,
                    'message' => 'Product not found in cart'
                ];
            }

            // Update cart total
            $this->refreshOrderPricing($orderId);
            $totalUpdated = true;

            if (!$totalUpdated) {
                throw new RuntimeException('Failed to update cart total');
            }

            // Save changes
            $this->db->commit();

            return [
                'success' => true,
                'message' => 'Product removed from cart'
            ];

        } catch (Throwable $e) {

            // Undo changes on error
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            return [
                'success' => false,
                'message' => 'Failed to remove product'
            ];
        }
    }
}
