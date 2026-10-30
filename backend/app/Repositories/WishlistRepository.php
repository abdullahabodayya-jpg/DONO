
<?php

class WishlistRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    // Get user's wishlist products
    public function getWishlist(int $userId): array
    {
        $sql = "SELECT
                    p.id,
                    p.name,
                    p.description,
                    p.price,
                    (
                        SELECT pi.image_url
                        FROM product_images pi
                        WHERE pi.product_id = p.id
                          AND pi.is_primary = 1
                        LIMIT 1
                    ) AS image_url
                FROM wishlist_items wi
                JOIN products p ON wi.product_id = p.id
                WHERE wi.user_id = ?
                ORDER BY wi.created_at DESC, wi.id DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Check if product is already in wishlist
    public function isInWishlist(int $userId, int $productId): bool
    {
        $sql = "SELECT id
                FROM wishlist_items
                WHERE user_id = ? AND product_id = ?
                LIMIT 1";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId, $productId]);

        return $stmt->fetch(PDO::FETCH_ASSOC) !== false;
    }

    // Add product to wishlist
    public function addToWishlist(int $userId, int $productId): bool
    {
        $sql = "INSERT INTO wishlist_items (user_id, product_id)
                VALUES (?, ?)";

        $stmt = $this->db->prepare($sql);

        return $stmt->execute([$userId, $productId]);
    }

    // Remove product from wishlist
    public function removeFromWishlist(int $userId, int $productId): bool
    {
        $sql = "DELETE FROM wishlist_items
                WHERE user_id = ? AND product_id = ?";

        $stmt = $this->db->prepare($sql);

        return $stmt->execute([$userId, $productId]);
    }
}
