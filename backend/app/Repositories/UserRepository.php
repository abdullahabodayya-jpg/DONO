<?php

class UserRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }


    public function create(array $userData): int|false
    {
        $sql = "INSERT INTO users (name, email, password_hash, phone, gender, address, role) 
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        $saved = $stmt->execute([
            $userData['name'],
            $userData['email'],
            $userData['password_hash'],
            $userData['phone'] ?? null,
            $userData['gender'] ?? null,
            $userData['address'] ?? null,
            $userData['role'] ?? 'customer'
        ]);

        return $saved ? (int) $this->db->lastInsertId() : false;
    }

    public function findById(int $userId): array|false
    {
        $sql = "SELECT id, name, email, phone, gender, address, role, created_at 
                FROM users 
                WHERE id = ? AND deleted_at IS NULL 
                LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

 
    public function findByEmail(string $email): array|false
    {
        $sql = "SELECT * FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$email]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    
    public function getAll(int $limit = 50, int $offset = 0): array
    {
        $sql = "SELECT u.id, u.name, u.email, u.phone, u.gender, u.address, u.role, u.created_at,
                       (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id AND o.status <> 'cart') AS total_orders,
                       (SELECT COALESCE(SUM(o.total_amount),0) FROM orders o WHERE o.user_id = u.id AND o.status = 'confirmed') AS total_spent
                FROM users u
                WHERE u.deleted_at IS NULL
                ORDER BY u.id DESC
                LIMIT ? OFFSET ?";
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->bindValue(2, $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

  
    public function countAll(): int
    {
        $stmt = $this->db->query("SELECT COUNT(*) FROM users WHERE deleted_at IS NULL");
        return (int) $stmt->fetchColumn();
    }

   
    public function update(int $userId, array $userData): bool
    {
        $sql = "UPDATE users 
                SET name = ?, phone = ?, gender = ?, address = ?, role = ? 
                WHERE id = ? AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            $userData['name'],
            $userData['phone'] ?? null,
            $userData['gender'] ?? null,
            $userData['address'] ?? null,
            $userData['role'] ?? 'customer',
            $userId
        ]);
    }


    public function updateProfileDetails(int $userId, string $phone, string $gender, string $address): bool
    {
        $sql = "UPDATE users 
                SET phone = ?, gender = ?, address = ? 
                WHERE id = ? AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$phone, $gender, $address, $userId]);
    }

 
    public function updatePassword(int $userId, string $newPasswordHash): bool
    {
        $sql = "UPDATE users 
                SET password_hash = ? 
                WHERE id = ? AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$newPasswordHash, $userId]);
    }


    public function delete(int $userId): bool
    {
        $sql = "UPDATE users SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$userId]);
    }

 
    public function restore(int $userId): bool
    {
        $sql = "UPDATE users SET deleted_at = NULL WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$userId]);
    }

 
    public function forceDelete(int $userId): bool
    {
        $sql = "DELETE FROM users WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$userId]);
    }
}

?>