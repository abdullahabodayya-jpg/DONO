<?php

class ProductImageRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function getByProductId(int $productId): array
    {
        $sql = "SELECT * FROM product_images
                WHERE product_id = ?
                ORDER BY is_primary DESC, id ASC";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([$productId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function addImage(
        int $productId,
        string $imageUrl,
        int $isPrimary = 0
    ): int {

        if ($isPrimary !== 0 && $isPrimary !== 1) {
            throw new InvalidArgumentException("Invalid primary status");
        }

        $this->db->beginTransaction();

        try {
            // Lock product while changing its images
            $sql = "SELECT id FROM products
                    WHERE id = ?
                    AND deleted_at IS NULL
                    FOR UPDATE";

            $stmt = $this->db->prepare($sql);
            $stmt->execute([$productId]);

            if (!$stmt->fetch()) {
                throw new InvalidArgumentException("Product not found");
            }

            // Check whether product already has images
            $sql = "SELECT COUNT(*) FROM product_images
                    WHERE product_id = ?";

            $stmt = $this->db->prepare($sql);
            $stmt->execute([$productId]);

            $imageCount = (int) $stmt->fetchColumn();

            // First image must be primary
            if ($imageCount === 0) {
                $isPrimary = 1;
            }

            // Remove previous primary image if needed
            if ($isPrimary === 1) {
                $sql = "UPDATE product_images
                        SET is_primary = 0
                        WHERE product_id = ?";

                $stmt = $this->db->prepare($sql);
                $stmt->execute([$productId]);
            }

            $sql = "INSERT INTO product_images
                    (product_id, image_url, is_primary)
                    VALUES (?, ?, ?)";

            $stmt = $this->db->prepare($sql);

            $stmt->execute([
                $productId,
                $imageUrl,
                $isPrimary
            ]);

            $imageId = (int) $this->db->lastInsertId();

            $this->db->commit();

            return $imageId;

        } catch (Throwable $e) {

            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            throw $e;
        }
    }

    public function getById(int $imageId, int $productId): array|false
    {
        $sql = "SELECT * FROM product_images
                WHERE id = ?
                AND product_id = ?";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            $imageId,
            $productId
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function deleteImage(int $imageId, int $productId): bool
    {
        $this->db->beginTransaction();

        try {
            // Lock product while changing its images
            $sql = "SELECT id FROM products
                    WHERE id = ?
                    FOR UPDATE";

            $stmt = $this->db->prepare($sql);
            $stmt->execute([$productId]);

            if (!$stmt->fetch()) {
                $this->db->rollBack();
                return false;
            }

            // Check if image exists
            $image = $this->getById($imageId, $productId);

            if (!$image) {
                $this->db->rollBack();
                return false;
            }

            $sql = "DELETE FROM product_images
                    WHERE id = ?
                    AND product_id = ?";

            $stmt = $this->db->prepare($sql);

            $stmt->execute([
                $imageId,
                $productId
            ]);

            // Check if any primary image remains
            $sql = "SELECT id FROM product_images
                    WHERE product_id = ?
                    AND is_primary = 1
                    LIMIT 1";

            $stmt = $this->db->prepare($sql);
            $stmt->execute([$productId]);

            $primaryImage = $stmt->fetch(PDO::FETCH_ASSOC);

            // Select another primary image if necessary
            if (!$primaryImage) {
                $sql = "SELECT id FROM product_images
                        WHERE product_id = ?
                        ORDER BY id ASC
                        LIMIT 1";

                $stmt = $this->db->prepare($sql);
                $stmt->execute([$productId]);

                $nextImageId = $stmt->fetchColumn();

                if ($nextImageId !== false) {
                    $sql = "UPDATE product_images
                            SET is_primary = 1
                            WHERE id = ?
                            AND product_id = ?";

                    $stmt = $this->db->prepare($sql);

                    $stmt->execute([
                        $nextImageId,
                        $productId
                    ]);
                }
            }

            $this->db->commit();

            return true;

        } catch (Throwable $e) {

            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            throw $e;
        }
    }

    public function setPrimaryImage(int $imageId, int $productId): bool
    {
        try {
            $this->db->beginTransaction();

            // Lock product while changing its images
            $sql = "SELECT id FROM products
                    WHERE id = ?
                    FOR UPDATE";

            $stmt = $this->db->prepare($sql);
            $stmt->execute([$productId]);

            if (!$stmt->fetch()) {
                $this->db->rollBack();
                return false;
            }

            // Check if image belongs to the product
            $image = $this->getById($imageId, $productId);

            if (!$image) {
                $this->db->rollBack();
                return false;
            }

            // Remove primary status from all product images
            $sql = "UPDATE product_images
                    SET is_primary = 0
                    WHERE product_id = ?";

            $stmt = $this->db->prepare($sql);
            $stmt->execute([$productId]);

            // Set selected image as primary
            $sql = "UPDATE product_images
                    SET is_primary = 1
                    WHERE id = ?
                    AND product_id = ?";

            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $imageId,
                $productId
            ]);

            $this->db->commit();

            return true;

        } catch (Throwable $e) {

            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            throw $e;
        }
    }
}