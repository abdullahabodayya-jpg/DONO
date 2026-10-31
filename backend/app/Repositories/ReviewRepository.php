<?php

class ReviewRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    // Get all reviews for a specific product
    public function getByProductId(int $productId): array
    {
        $sql = "SELECT r.id, r.rating, r.comment, r.created_at, u.name AS customer_name
                FROM reviews r
                JOIN users u ON u.id = r.user_id
                WHERE r.product_id = ?
                ORDER BY r.created_at DESC, r.id DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$productId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Get average rating and total reviews
    public function getProductRatingSummary(int $productId): array
    {
        $sql = "SELECT
                    COUNT(*) AS total_reviews,
                    COALESCE(ROUND(AVG(rating), 1), 0) AS average_rating
                FROM reviews
                WHERE product_id = ?";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$productId]);

        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            "total_reviews" => (int) $result["total_reviews"],
            "average_rating" => (float) $result["average_rating"]
        ];
    }

    // Check if user already reviewed the product
    public function hasUserReviewed(int $userId, int $productId): bool
    {
        $sql = "SELECT id
                FROM reviews
                WHERE user_id = ?
                AND product_id = ?
                LIMIT 1";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId, $productId]);

        return $stmt->fetch(PDO::FETCH_ASSOC) !== false;
    }

    // Create a new review
    public function create(
        int $userId,
        int $productId,
        int $rating,
        ?string $comment
    ): int {
        $sql = "INSERT INTO reviews
                (user_id, product_id, rating, comment)
                VALUES (?, ?, ?, ?)";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            $userId,
            $productId,
            $rating,
            $comment
        ]);

        return (int) $this->db->lastInsertId();
    }

    // Get all reviews for admin management
    public function getAll(): array
    {
        $sql = "SELECT
                    r.id,
                    r.user_id,
                    r.product_id,
                    p.name AS product_name,
                    r.rating,
                    r.comment,
                    r.created_at
                FROM reviews r
                LEFT JOIN products p
                    ON r.product_id = p.id
                ORDER BY r.created_at DESC, r.id DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Find one review by ID
    public function getById(int $reviewId): array|false
    {
        $sql = "SELECT *
                FROM reviews
                WHERE id = ?";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$reviewId]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Delete a review
    public function delete(int $reviewId): bool
    {
        $sql = "DELETE FROM reviews
                WHERE id = ?";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$reviewId]);

        return $stmt->rowCount() > 0;
    }
}