
<?php

require_once __DIR__ . '/../Repositories/OrderRepository.php';

class OrderController
{
    private OrderRepository $orderRepository;

    public function __construct(PDO $pdo)
    {
        $this->orderRepository = new OrderRepository($pdo);
    }

    public function getMyOrders(): void
    {
        header('Content-Type: application/json');

        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        if (!isset($_SESSION['user']['id'])) {

            http_response_code(401);

            echo json_encode([
                'success' => false,
                'message' => 'Unauthorized'
            ]);

            return;
        }

      
        $userId = (int) $_SESSION['user']['id'];

        $orders = $this->orderRepository->getUserOrders($userId);

        
        foreach ($orders as &$order) {

            $order['items'] = $this->orderRepository->getOrderItems(
                (int) $order['id']
            );
        }

        unset($order);

      
        echo json_encode([
            'success' => true,
            'message' => 'Orders loaded successfully',
            'data' => $orders
        ]);
    }
}
