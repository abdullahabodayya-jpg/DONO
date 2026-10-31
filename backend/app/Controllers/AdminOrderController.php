<?php

require_once __DIR__ . '/../Repositories/AdminOrderRepository.php';

class AdminOrderController
{
    private AdminOrderRepository $orders;

    public function __construct(PDO $pdo)
    {
        $this->orders = new AdminOrderRepository($pdo);
    }

    // Check admin permission
    private function checkAdmin(): bool
    {
        if (
            !isset($_SESSION['user']) ||
            $_SESSION['user']['role'] !== 'admin'
        ) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Access denied'
            ]);
            return false;
        }

        return true;
    }

    // Get all orders
    public function getAllOrders(): void
    {
        if (!$this->checkAdmin()) {
            return;
        }

        $orders = $this->orders->getAllOrders();

        foreach ($orders as &$order) {
            $order['items'] = $this->orders->getOrderItems((int) $order['id']);
        }
        unset($order);

        echo json_encode([
            'success' => true,
            'data' => $orders
        ]);
    }

    // Update order status
    public function updateStatus(int $orderId): void
    {
        if (!$this->checkAdmin()) {
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $status = $data['status'] ?? '';

        if (!in_array($status, ['pending', 'confirmed', 'cancelled'], true)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Invalid order status'
            ]);
            return;
        }

        $updated = $this->orders->updateStatus($orderId, $status);

        echo json_encode([
            'success' => $updated,
            'message' => $updated
                ? 'Order status updated'
                : 'Failed to update order'
        ]);
    }
}