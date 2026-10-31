
<?php

require_once __DIR__ . '/../Helpers/CartHelper.php';

final class CartRepository
{
    private PDO $db;

    // Store the database connection
    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    // Get the user's active cart
    public function getCartByUserId(int $userId): array|false
    {
        $sql = "SELECT o.*, c.code AS coupon_code FROM orders o
                LEFT JOIN coupons c ON c.id = o.coupon_id
                WHERE o.user_id = ?
                AND o.status = 'cart'";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Create a new cart for the user
    public function createCart(int $userId): int
    {
        $orderNumber = 'DONO-' . bin2hex(random_bytes(12));

        $sql = "INSERT INTO orders
                (user_id, order_number, status)
                VALUES (?, ?, 'cart')";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            $userId,
            $orderNumber
        ]);

        return (int) $this->db->lastInsertId();
    }

    // Add a new product to the cart
    public function addCartItem(
        int $orderId,
        int $productId,
        string $productName,
        float $unitPrice,
        int $quantity
    ): bool {

        $lineTotal = CartHelper::calculateLineTotal(
            $unitPrice,
            $quantity
        );

        $sql = "INSERT INTO order_items
                (order_id, product_id, product_name,
                 unit_price, quantity, line_total)
                VALUES (?, ?, ?, ?, ?, ?)";

        $stmt = $this->db->prepare($sql);

        return $stmt->execute([
            $orderId,
            $productId,
            $productName,
            $unitPrice,
            $quantity,
            $lineTotal
        ]);
    }

    // Get a specific product from the cart
    public function getCartItem(int $orderId, int $productId): array|false
    {
        $sql = "SELECT * FROM order_items
                WHERE order_id = ?
                AND product_id = ?";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            $orderId,
            $productId
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Update the quantity and price of a cart item
    public function updateCartItem(
        int $orderId,
        int $productId,
        int $quantity,
        float $unitPrice
    ): bool {

        $lineTotal = CartHelper::calculateLineTotal(
            $unitPrice,
            $quantity
        );

        $sql = "UPDATE order_items
                SET quantity = ?,
                    unit_price = ?,
                    line_total = ?
                WHERE order_id = ?
                AND product_id = ?";

        $stmt = $this->db->prepare($sql);

        return $stmt->execute([
            $quantity,
            $unitPrice,
            $lineTotal,
            $orderId,
            $productId
        ]);
    }

    // Remove a product from the cart
    public function removeCartItem(int $orderId, int $productId): bool
    {
        $sql = "DELETE FROM order_items
                WHERE order_id = ?
                AND product_id = ?";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            $orderId,
            $productId
        ]);

        return $stmt->rowCount() > 0;
    }

    // Get all cart items with product details
    public function getCartItems(int $orderId): array
    {
        $sql = "SELECT
                    oi.product_id,
                    oi.product_name,
                    oi.unit_price,
                    oi.quantity,
                    oi.line_total,
                    p.description,
                    (
                        SELECT pi.image_url
                        FROM product_images pi
                        WHERE pi.product_id = oi.product_id
                        AND pi.is_primary = 1
                        LIMIT 1
                    ) AS image
                FROM order_items oi
                LEFT JOIN products p
                    ON oi.product_id = p.id
                WHERE oi.order_id = ?";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$orderId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Recalculate the cart subtotal and total
    public function updateCartTotal(int $orderId): bool
    {
        $sql = "UPDATE orders
                SET subtotal = (
                    SELECT COALESCE(SUM(line_total), 0)
                    FROM order_items
                    WHERE order_id = ?
                ),
                total_amount = (
                    SELECT COALESCE(SUM(line_total), 0)
                    FROM order_items
                    WHERE order_id = ?
                ) - discount_amount + shipping_fee
                WHERE id = ?
                AND status = 'cart'";

        $stmt = $this->db->prepare($sql);

        return $stmt->execute([
            $orderId,
            $orderId,
            $orderId
        ]);
    }
}
