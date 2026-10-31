<?php

declare(strict_types=1);

final class CouponRepository
{
    public function __construct(private PDO $pdo)
    {
    }

    public function connection(): PDO
    {
        return $this->pdo;
    }

    public function getAll(): array
    {
        $statement = $this->pdo->query(
            'SELECT id, code, discount_type, discount_value,
                    min_order_amount, start_date, end_date, is_active
             FROM coupons
             ORDER BY id DESC'
        );

        return $statement->fetchAll();
    }

    public function findById(int $id): array|false
    {
        $statement = $this->pdo->prepare(
            'SELECT id, code, discount_type, discount_value,
                    min_order_amount, start_date, end_date, is_active
             FROM coupons
             WHERE id = :id
             LIMIT 1'
        );

        $statement->execute(['id' => $id]);

        return $statement->fetch();
    }

    public function findByCode(string $code) {
        $statement = $this->pdo->prepare(
            'SELECT id, code, discount_type, discount_value,
                    min_order_amount, start_date, end_date, is_active
             FROM coupons
             WHERE code = :code
             LIMIT 1'

        );
        $statement->execute(['code' => $code]);

        return $statement->fetch();
    }

    public function create(array  $data): int
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO coupons (
                code, discount_type, discount_value,
                min_order_amount, start_date, end_date, is_active
            ) VALUES (
                :code, :discount_type, :discount_value,
                :min_order_amount, :start_date, :end_date, :is_active
            )'
        );

        $statement->execute($data);

        return (int) $this->pdo->lastInsertId();
    }

     public function update(int $id, array $data): bool
    {
        $statement = $this->pdo->prepare(
            'UPDATE coupons
             SET code = :code,
                 discount_type = :discount_type,
                 discount_value = :discount_value,
                 min_order_amount = :min_order_amount,
                 start_date = :start_date,
                 end_date = :end_date,
                 is_active = :is_active
             WHERE id = :id'
        );

        $data['id'] = $id;
        $statement->execute($data);

        return $statement->rowCount() > 0;
    }

    public function delete(int $id): bool
    {
        $statement = $this->pdo->prepare(
            'DELETE FROM coupons WHERE id = :id'
        );

        $statement->execute(['id' => $id]);

        return $statement->rowCount() > 0;
    }
}
