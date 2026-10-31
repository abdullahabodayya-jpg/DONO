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

    /** Search/filter happens in MySQL before pagination, not on a single loaded page. */
    private function publicFilters(array $filters): array
    {
        $where = ['p.is_active = 1', 'p.deleted_at IS NULL', 'c.deleted_at IS NULL'];
        $params = [];
        $search = trim((string)($filters['search'] ?? ''));
        if ($search !== '') {
            $where[] = '(p.name LIKE :search OR p.description LIKE :search2 OR c.name LIKE :search3)';
            $params['search'] = $params['search2'] = $params['search3'] = '%' . $search . '%';
        }
        if (!empty($filters['category'])) {
            $where[] = 'p.category_id = :category';
            $params['category'] = (int) $filters['category'];
        }
        if (!empty($filters['type'])) {
            $where[] = 'p.product_type = :type';
            $params['type'] = (string)$filters['type'];
        }
        if ($filters['age'] !== null && $filters['age'] !== '') {
            if (!$this->hasAgeFields()) throw new DomainException('Run migration_product_age.sql to enable age filtering.');
            $where[] = 'p.age_min IS NOT NULL AND p.age_max IS NOT NULL AND p.age_min <= :age AND p.age_max >= :age_max';
            $params['age'] = $params['age_max'] = (int)$filters['age'];
        }
        return [implode(' AND ', $where), $params];
    }

    public function hasAgeFields(): bool
    {
        $query = $this->db->query("SHOW COLUMNS FROM products LIKE 'age_min'");
        return (bool)$query->fetch(PDO::FETCH_ASSOC);
    }

    public function getActiveProducts(int $limit = 12, int $offset = 0, array $filters = []): array
    {
        [$where, $params] = $this->publicFilters($filters);
        $ageColumns = $this->hasAgeFields() ? 'p.age_min,p.age_max,' : 'NULL AS age_min,NULL AS age_max,';
        $sql = "SELECT p.id,p.name,p.description,p.price,p.product_type,p.stock_quantity,p.is_active,
                       {$ageColumns} c.id AS category_id,c.name AS category_name,pi.image_url
                FROM products p
                INNER JOIN categories c ON c.id=p.category_id
                LEFT JOIN product_images pi ON pi.product_id=p.id AND pi.is_primary=1
                WHERE {$where}
                ORDER BY p.created_at DESC,p.id DESC LIMIT :limit OFFSET :offset";
        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $val) $stmt->bindValue(':' . $key, $val, is_int($val) ? PDO::PARAM_INT : PDO::PARAM_STR);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getActiveProductById(int $productId): ?array
    {
        // Get one active product with its category and primary image
        $sql = "SELECT
                    p.id,
                    p.name,
                    p.description,
                    p.price,
                    p.stock_quantity,
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

                WHERE p.id = :id
                AND p.is_active = 1
                AND p.deleted_at IS NULL

                LIMIT 1";

        $stmt = $this->db->prepare($sql);

        $stmt->bindValue(":id", $productId, PDO::PARAM_INT);

        $stmt->execute();

        $product = $stmt->fetch(PDO::FETCH_ASSOC);

        return $product ?: null;
    }

    public function countActiveProducts(array $filters = []): int
    {
        [$where, $params] = $this->publicFilters($filters);
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM products p INNER JOIN categories c ON c.id=p.category_id WHERE {$where}");
        foreach ($params as $key => $val) $stmt->bindValue(':' . $key, $val, is_int($val) ? PDO::PARAM_INT : PDO::PARAM_STR);
        $stmt->execute();
        return (int) $stmt->fetchColumn();
    }

    /** Optional age classification. The additive migration is mandatory before nonempty ages. */
    public function setAgeRange(int $productId, ?int $minimum, ?int $maximum): void
    {
        if (!$this->hasAgeFields()) {
            if ($minimum !== null || $maximum !== null) throw new DomainException('Install migration_product_age.sql first.');
            return;
        }
        $stmt = $this->db->prepare('UPDATE products SET age_min=?,age_max=? WHERE id=? AND deleted_at IS NULL');
        $stmt->execute([$minimum,$maximum,$productId]);
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

    public function getAvailableCategories(): array
    {
        // Get categories that are not deleted
        $sql = "SELECT
                    id,
                    name,
                    description,
                    image AS image_url
                FROM categories
                WHERE deleted_at IS NULL
                ORDER BY name ASC";

        $stmt = $this->db->prepare($sql);

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
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