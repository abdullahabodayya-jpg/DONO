
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

    // Get the user's cart and products
    public function getCart(int $userId): array
    {
        $cart = $this->cartRepository->getCartByUserId($userId);

        if (!$cart) {
            return [
                'cart' => null,
                'items' => []
            ];
        }

        $items = $this->cartRepository->getCartItems(
            (int) $cart['id']
        );

        return [
            'cart' => $cart,
            'items' => $items
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
            $totalUpdated = $this->cartRepository->updateCartTotal(
                $orderId
            );

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
            $totalUpdated = $this->cartRepository->updateCartTotal(
                $orderId
            );

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
            $totalUpdated = $this->cartRepository->updateCartTotal(
                $orderId
            );

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
