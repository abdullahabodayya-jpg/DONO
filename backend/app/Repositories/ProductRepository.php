<?php

class ProductRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function getAll(): array
    {
        $sql = "SELECT * FROM products
                WHERE deleted_at IS NULL
                ORDER BY created_at DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getActiveProducts(int $limit = 12, int $offset = 0): array
    {
        // Get active products with category and primary image
        $sql = "SELECT
                    p.id,
                    p.name,
                    p.description,
                    p.price,
                    p.product_type,
                    p.is_active,
                    c.id AS category_id,
                    c.name AS category_name,
                    pi.image_url
                FROM products p

                INNER JOIN categories c
                    ON p.category_id = c.id
                    AND c.deleted_at IS NULL

                LEFT JOIN product_images pi
                    ON pi.product_id = p.id
                    AND pi.is_primary = 1

                WHERE p.is_active = 1
                AND p.deleted_at IS NULL

                ORDER BY p.created_at DESC, p.id DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($sql);

        $stmt->bindValue(":limit", $limit, PDO::PARAM_INT);
        $stmt->bindValue(":offset", $offset, PDO::PARAM_INT);

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }


    public function countActiveProducts(): int
    {
        // Count active products in available categories
        $sql = "SELECT COUNT(*)
                FROM products p
                INNER JOIN categories c
                    ON p.category_id = c.id
                    AND c.deleted_at IS NULL
                WHERE p.is_active = 1
                AND p.deleted_at IS NULL";

        $stmt = $this->db->prepare($sql);
        $stmt->execute();

        return (int) $stmt->fetchColumn();
    }


    public function getById(int $productId): array|false
    {
        $sql = "SELECT * FROM products
                WHERE id = ?
                AND deleted_at IS NULL";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([$productId]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function categoryExists(int $categoryId): bool
    {
        $sql = "SELECT id FROM categories
                WHERE id = ?
                AND deleted_at IS NULL";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$categoryId]);

        return $stmt->fetch(PDO::FETCH_ASSOC) !== false;
    }

    public function create(
        int $categoryId,
        string $name,
        ?string $description,
        float $price,
        int $stockQuantity,
        string $productType,
        int $isActive
    ): int {

        $sql = "INSERT INTO products
                (category_id, name, description, price,
                stock_quantity, product_type, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?)";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            $categoryId,
            $name,
            $description,
            $price,
            $stockQuantity,
            $productType,
            $isActive
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function update(
        int $productId,
        int $categoryId,
        string $name,
        ?string $description,
        float $price,
        int $stockQuantity,
        string $productType,
        int $isActive
    ): bool {

        $sql = "UPDATE products
                SET category_id = ?,
                    name = ?,
                    description = ?,
                    price = ?,
                    stock_quantity = ?,
                    product_type = ?,
                    is_active = ?
                WHERE id = ?
                AND deleted_at IS NULL";

        $stmt = $this->db->prepare($sql);

        return $stmt->execute([
            $categoryId,
            $name,
            $description,
            $price,
            $stockQuantity,
            $productType,
            $isActive,
            $productId
        ]);
    }

    public function delete(int $productId): bool
    {
        $sql = "UPDATE products
                SET deleted_at = NOW(),
                    is_active = 0
                WHERE id = ?
                AND deleted_at IS NULL";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([$productId]);

        return $stmt->rowCount() > 0;
    }
}