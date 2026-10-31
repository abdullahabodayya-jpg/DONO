
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

        $items=$stmt->fetchAll(PDO::FETCH_ASSOC);
        // Existing custom_orders.prompt stores the prefixed custom box configuration.
        $build=$this->pdo->prepare("SELECT prompt FROM custom_orders WHERE order_item_id=? AND prompt LIKE 'DONO_CUSTOM_BOX_V1:%' LIMIT 1");
        $parts=$this->pdo->prepare('SELECT g.product_id,g.quantity,g.unit_price,p.name FROM gift_box_items g JOIN products p ON p.id=g.product_id WHERE g.order_item_id=?');
        foreach ($items as &$item) {
            $build->execute([(int)$item['id']]);
            $json=$build->fetchColumn();
            if ($json !== false) {
                $parts->execute([(int)$item['id']]);
                $item['custom_box']=['configuration'=>json_decode(substr((string)$json, strlen('DONO_CUSTOM_BOX_V1:')),true),'components'=>$parts->fetchAll(PDO::FETCH_ASSOC)];
            }
        }
        unset($item);
        return $items;
    }

    public function getGiftDetails(int $orderId): array|false
    {
        $stmt=$this->pdo->prepare('SELECT recipient_name,recipient_phone,recipient_address,gift_message,hide_price,wrapping_type,wrapping_fee FROM order_gift_details WHERE order_id = ?');
        $stmt->execute([$orderId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
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
