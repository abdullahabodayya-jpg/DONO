<?php

declare(strict_types=1);

final class Category
{
    public function __construct(private PDO $pdo)
    {
    }

    public function getAll(?string $search = null, ?string $status = null): array
    {
        $sql = 'SELECT c.id, c.name, c.description, c.image, c.is_active,
                       COUNT(p.id) AS products_count
                FROM categories c
                LEFT JOIN products p
                       ON p.category_id = c.id AND p.deleted_at IS NULL
                WHERE c.deleted_at IS NULL';

        $params = [];

        if ($search !== null && $search !== '') {
            $sql .= ' AND c.name LIKE :search';
            $params['search'] = '%' . $search . '%';
        }

        if ($status === 'active') {
            $sql .= ' AND c.is_active = 1';
        } elseif ($status === 'inactive') {
            $sql .= ' AND c.is_active = 0';
        }

        $sql .= ' GROUP BY c.id ORDER BY c.id DESC';

        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);

        return $statement->fetchAll();
    }

    public function findById(int $id): array|false
    {
        $statement = $this->pdo->prepare(
            'SELECT c.id, c.name, c.description, c.image, c.is_active,
                    COUNT(p.id) AS products_count
             FROM categories c
             LEFT JOIN products p
                    ON p.category_id = c.id AND p.deleted_at IS NULL
             WHERE c.id = :id AND c.deleted_at IS NULL
             GROUP BY c.id
             LIMIT 1'
        );

        $statement->execute(['id' => $id]);

        return $statement->fetch();
    }

    // بدون فلتر deleted_at لأن الـ UNIQUE على name يشمل المحذوف soft
    public function findByName(string $name): array|false
    {
        $statement = $this->pdo->prepare(
            'SELECT id, name FROM categories WHERE name = :name LIMIT 1'
        );

        $statement->execute(['name' => $name]);

        return $statement->fetch();
    }

    public function create(array $data): int
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO categories (name, description, image, is_active)
             VALUES (:name, :description, :image, :is_active)'
        );

        $statement->execute($data);

        return (int) $this->pdo->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $statement = $this->pdo->prepare(
            'UPDATE categories
             SET name = :name,
                 description = :description,
                 image = :image,
                 is_active = :is_active
             WHERE id = :id AND deleted_at IS NULL'
        );

        $data['id'] = $id;
        $statement->execute($data);

        return $statement->rowCount() > 0;
    }

    public function hasProducts(int $id): bool
    {
        $statement = $this->pdo->prepare(
            'SELECT COUNT(*) FROM products
             WHERE category_id = :id AND deleted_at IS NULL'
        );

        $statement->execute(['id' => $id]);

        return (int) $statement->fetchColumn() > 0;
    }

    // Soft delete
    public function delete(int $id): bool
    {
        $statement = $this->pdo->prepare(
            'UPDATE categories
             SET deleted_at = NOW()
             WHERE id = :id AND deleted_at IS NULL'
        );

        $statement->execute(['id' => $id]);

        return $statement->rowCount() > 0;
    }
}