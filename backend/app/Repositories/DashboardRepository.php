<?php

class DashboardRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    // Execute a SELECT query and return all rows
    private function getRows(string $sql, array $params = []): array
    {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Execute a SELECT query and return one value
    private function getValue(string $sql, array $params = []): mixed
    {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchColumn();
    }

    // Get the first date of the selected period
    private function getPeriodStart(int $period): string
    {
        $sql = "SELECT DATE_SUB(CURDATE(), INTERVAL ? DAY)";

        $stmt = $this->db->prepare($sql);

        // Include today in the selected period
        $stmt->bindValue(1, $period - 1, PDO::PARAM_INT);
        $stmt->execute();

        return (string) $stmt->fetchColumn();
    }

    // Get all data required by the dashboard
    public function getDashboardData(int $period): array
    {
        if (!in_array($period, [7, 30, 90], true)) {
            throw new InvalidArgumentException("Invalid dashboard period");
        }

        $startDate = $this->getPeriodStart($period);

        $alerts = $this->getAlerts();

        return [
            "kpis" => $this->getKpis($startDate, $alerts),
            "charts" => [
                "sales" => $this->getSalesChart($startDate),
                "orders" => $this->getOrderStatusChart($startDate),
                "top_products" => $this->getTopProductsChart($startDate)
            ],
            "alerts" => $alerts,
            "recent_orders" => $this->getRecentOrders(),
            "low_stock_products" => $this->getLowStockProducts()
        ];
    }

    // ===================================
    // 1. PERFORMANCE SUMMARY
    // ===================================

    private function getKpis(string $startDate, array $alerts): array
    {
        // Calculate paid revenue using successful payments
        // Exclude cart and cancelled orders
        $salesSql = "SELECT COALESCE(SUM(pay.amount), 0)
                     FROM payments pay
                     INNER JOIN orders o ON o.id = pay.order_id
                     WHERE pay.status = 'succeeded'
                     AND o.status IN ('pending', 'confirmed')
                     AND pay.created_at >= ?";

        $netSales = (float) $this->getValue(
            $salesSql,
            [$startDate]
        );

        // Count placed orders and calculate their average value
        $ordersSql = "SELECT
                          COUNT(*) AS total_orders,
                          COALESCE(
                              AVG(
                                  CASE
                                      WHEN status IN ('pending', 'confirmed')
                                      THEN total_amount
                                  END
                              ), 0
                          ) AS average_order_value
                      FROM orders
                      WHERE status != 'cart'
                      AND created_at >= ?";

        $orders = $this->getRows(
            $ordersSql,
            [$startDate]
        );

        $ordersData = $orders[0] ?? [];

        return [
            "net_sales" => $netSales,
            "total_orders" => (int) ($ordersData["total_orders"] ?? 0),
            "average_order_value" => (float) ($ordersData["average_order_value"] ?? 0),
            "pending_orders" => $alerts["pending_orders"]
        ];
    }

    // ===================================
    // 2. SALES PERFORMANCE CHART
    // ===================================

    private function getSalesChart(string $startDate): array
    {
        // Group successful payments by payment date
        $sql = "SELECT
                    DATE(pay.created_at) AS label,
                    SUM(pay.amount) AS total
                FROM payments pay
                INNER JOIN orders o ON o.id = pay.order_id
                WHERE pay.status = 'succeeded'
                AND o.status IN ('pending', 'confirmed')
                AND pay.created_at >= ?
                GROUP BY DATE(pay.created_at)
                ORDER BY label ASC";

        $rows = $this->getRows(
            $sql,
            [$startDate]
        );

        $labels = [];
        $values = [];

        foreach ($rows as $row) {
            $labels[] = (string) $row["label"];
            $values[] = (float) $row["total"];
        }

        return [
            "labels" => $labels,
            "values" => $values
        ];
    }

    // ===================================
    // 3. ORDERS BY STATUS CHART
    // ===================================

    private function getOrderStatusChart(string $startDate): array
    {
        // Exclude shopping carts from order statistics
        $sql = "SELECT
                    status AS label,
                    COUNT(*) AS total
                FROM orders
                WHERE status != 'cart'
                AND created_at >= ?
                GROUP BY status
                ORDER BY FIELD(
                    status,
                    'pending',
                    'confirmed',
                    'cancelled'
                )";

        $rows = $this->getRows(
            $sql,
            [$startDate]
        );

        $labels = [];
        $values = [];

        foreach ($rows as $row) {
            $labels[] = (string) $row["label"];
            $values[] = (int) $row["total"];
        }

        return [
            "labels" => $labels,
            "values" => $values
        ];
    }

    // ===================================
    // 4. TOP SELLING PRODUCTS
    // ===================================

    private function getTopProductsChart(string $startDate): array
    {
        // Count units in orders that have a successful payment
        // EXISTS prevents counting order items multiple times
        $sql = "SELECT
                    MAX(oi.product_name) AS label,
                    SUM(oi.quantity) AS total
                FROM order_items oi
                INNER JOIN orders o ON o.id = oi.order_id
                WHERE o.status IN ('pending', 'confirmed')
                AND EXISTS (
                    SELECT 1
                    FROM payments pay
                    WHERE pay.order_id = o.id
                    AND pay.status = 'succeeded'
                    AND pay.created_at >= ?
                )
                GROUP BY oi.product_id
                ORDER BY total DESC
                LIMIT 5";

        $rows = $this->getRows(
            $sql,
            [$startDate]
        );

        $labels = [];
        $values = [];

        foreach ($rows as $row) {
            $labels[] = (string) $row["label"];
            $values[] = (int) $row["total"];
        }

        return [
            "labels" => $labels,
            "values" => $values
        ];
    }

    // ===================================
    // 5. NEEDS ATTENTION
    // ===================================

    private function getAlerts(): array
    {
        // Count active products with 5 items or less
        $lowStockSql = "SELECT COUNT(*)
                        FROM products
                        WHERE deleted_at IS NULL
                        AND is_active = 1
                        AND stock_quantity <= 5";

        $lowStockCount = (int) $this->getValue($lowStockSql);

        // Pending orders require processing
        $pendingSql = "SELECT COUNT(*)
                       FROM orders
                       WHERE status = 'pending'";

        $pendingOrders = (int) $this->getValue($pendingSql);

        // Reviews have no approval or pending status
        $reviewsSql = "SELECT COUNT(*) FROM reviews";

        $totalReviews = (int) $this->getValue($reviewsSql);

        // Count orders with failed payments and no successful payment
        $paymentIssuesSql = "SELECT COUNT(DISTINCT pay.order_id)
                             FROM payments pay
                             INNER JOIN orders o
                                 ON o.id = pay.order_id
                             WHERE pay.status = 'failed'
                             AND o.status IN ('pending', 'confirmed')
                             AND NOT EXISTS (
                                 SELECT 1
                                 FROM payments successful
                                 WHERE successful.order_id = pay.order_id
                                 AND successful.status = 'succeeded'
                             )";

        $paymentIssues = (int) $this->getValue($paymentIssuesSql);

        return [
            "low_stock_count" => $lowStockCount,
            "pending_orders" => $pendingOrders,
            "total_reviews" => $totalReviews,
            "payment_issues" => $paymentIssues
        ];
    }

    // ===================================
    // 6. RECENT ORDERS
    // ===================================

    private function getRecentOrders(): array
    {
        // Get the latest 5 placed orders
        $sql = "SELECT
                    id,
                    order_number,
                    total_amount,
                    status
                FROM orders
                WHERE status != 'cart'
                ORDER BY created_at DESC, id DESC
                LIMIT 5";

        $rows = $this->getRows($sql);

        $orders = [];

        foreach ($rows as $row) {
            $orders[] = [
                "id" => (int) $row["id"],
                "order_number" => $row["order_number"],
                "total_amount" => (float) $row["total_amount"],
                "status" => $row["status"]
            ];
        }

        return $orders;
    }

    // ===================================
    // 7. LOW STOCK PRODUCTS
    // ===================================

    private function getLowStockProducts(): array
    {
        // Get the 5 active products with the lowest stock
        $sql = "SELECT
                    id,
                    name,
                    stock_quantity
                FROM products
                WHERE deleted_at IS NULL
                AND is_active = 1
                AND stock_quantity <= 5
                ORDER BY stock_quantity ASC, id DESC
                LIMIT 5";

        $rows = $this->getRows($sql);

        $products = [];

        foreach ($rows as $row) {
            $products[] = [
                "id" => (int) $row["id"],
                "name" => $row["name"],
                "stock_quantity" => (int) $row["stock_quantity"]
            ];
        }

        return $products;
    }
}