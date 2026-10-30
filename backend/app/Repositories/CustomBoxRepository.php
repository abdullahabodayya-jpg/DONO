<?php

namespace App\Repositories;

use PDO;
use Exception;

class CustomBoxRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function getProductsByCategory(string $categoryName): array
    {
        $sql = "SELECT p.id, p.name, p.price, MAX(pi.image_url) AS image_url, c.id AS category_id, c.name AS category_name
                FROM products p
                INNER JOIN categories c ON p.category_id = c.id
                LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
                WHERE LOWER(c.name) = LOWER(?) AND p.deleted_at IS NULL AND p.is_active = 1
                GROUP BY p.id, p.name, p.price, c.id, c.name";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$categoryName]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getGiftProducts(): array
    {
        $sql = "SELECT p.id, p.name, p.price, MAX(pi.image_url) AS image_url, c.id AS category_id, c.name AS category_name
                FROM products p
                INNER JOIN categories c ON p.category_id = c.id
                LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
                WHERE LOWER(c.name) NOT IN ('box', 'boxes', 'card', 'cards') 
                  AND p.deleted_at IS NULL AND p.is_active = 1
                GROUP BY p.id, p.name, p.price, c.id, c.name";
        $stmt = $this->db->query($sql);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getGiftCategories(): array
    {
        $sql = "SELECT id, name 
                FROM categories 
                WHERE LOWER(name) NOT IN ('box', 'boxes', 'card', 'cards')";
        $stmt = $this->db->query($sql);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findProductById(int $id): array|false
    {
        $sql = "SELECT id, name, price FROM products WHERE id = ? AND deleted_at IS NULL AND is_active = 1 LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getOrCreateActiveCartOrderId(int $userId): int
    {
        $sql = "SELECT id FROM orders WHERE user_id = ? AND status = 'cart' LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($order) {
            return (int) $order['id'];
        }

        $orderNumber = 'ORD-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
        $insertSql = "INSERT INTO orders (user_id, order_number, status, subtotal, discount_amount, shipping_fee, total_amount) 
                      VALUES (?, ?, 'cart', 0.00, 0.00, 0.00, 0.00)";
        $insertStmt = $this->db->prepare($insertSql);
        $insertStmt->execute([$userId, $orderNumber]);

        return (int) $this->db->lastInsertId();
    }

    public function saveCustomBoxOrder(int $userId, array $boxProduct, array $giftBoxItems, float $boxTotal): int|false
    {
        try {
            $this->db->beginTransaction();

            $orderId = $this->getOrCreateActiveCartOrderId($userId);

            $sqlOrderItem = "INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total) 
                             VALUES (?, ?, ?, ?, 1, ?)";
            $stmtOrderItem = $this->db->prepare($sqlOrderItem);
            $stmtOrderItem->execute([
                $orderId,
                $boxProduct['id'],
                $boxProduct['name'],
                $boxTotal,
                $boxTotal
            ]);

            $orderItemId = (int) $this->db->lastInsertId();

            $sqlGiftItem = "INSERT INTO gift_box_items (order_item_id, product_id, quantity, unit_price) 
                            VALUES (?, ?, ?, ?)";
            $stmtGiftItem = $this->db->prepare($sqlGiftItem);

            foreach ($giftBoxItems as $item) {
                $stmtGiftItem->execute([
                    $orderItemId,
                    $item['product_id'],
                    $item['quantity'],
                    $item['unit_price']
                ]);
            }

            $sqlUpdateOrder = "UPDATE orders 
                               SET subtotal = subtotal + ?, 
                                   total_amount = total_amount + ? 
                               WHERE id = ?";
            $stmtUpdateOrder = $this->db->prepare($sqlUpdateOrder);
            $stmtUpdateOrder->execute([$boxTotal, $boxTotal, $orderId]);

            $this->db->commit();
            return $orderItemId;
        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("Failed to save custom box: " . $e->getMessage());
            return false;
        }
    }
}