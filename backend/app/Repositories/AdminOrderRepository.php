
<?php

class AdminOrderRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    // Get all orders except carts
    public function getAllOrders(): array
    {
        $sql = "SELECT orders.*, users.name AS customer_name
                FROM orders
                JOIN users ON orders.user_id = users.id
                WHERE orders.status != 'cart'
                ORDER BY orders.created_at DESC";

        $stmt = $this->pdo->query($sql);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Get products inside an order
    public function getOrderItems(int $orderId): array
    {
        $sql = "SELECT * FROM order_items WHERE order_id = ?";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$orderId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Update order status
    public function updateStatus(int $orderId, string $status): bool
    {
        $sql = "UPDATE orders
                SET status = ?
                WHERE id = ? AND status != 'cart'";

        $stmt = $this->pdo->prepare($sql);

        return $stmt->execute([$status, $orderId]);
    }
}
