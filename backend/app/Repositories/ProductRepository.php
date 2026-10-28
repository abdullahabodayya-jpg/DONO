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

    public function getById(int $productId): array|false
    {
        $sql = "SELECT * FROM products
                WHERE id = ?
                AND deleted_at IS NULL";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([$productId]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
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