
<?php

require_once __DIR__ . '/../Repositories/WishlistRepository.php';
require_once __DIR__ . '/../Repositories/ProductRepository.php';

final class WishlistController
{
    private WishlistRepository $wishlistRepository;
    private ProductRepository $productRepository;

    // Initialize repositories
    public function __construct(PDO $db)
    {
        $this->wishlistRepository = new WishlistRepository($db);
        $this->productRepository = new ProductRepository($db);
    }

    // Get user's wishlist
    public function getWishlist(int $userId): array
    {
        try {
            $items = $this->wishlistRepository->getWishlist($userId);

            return [
                'success' => true,
                'message' => 'Wishlist loaded successfully',
                'items' => $items
            ];

        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to load wishlist'
            ];
        }
    }

    // Add product to wishlist
    public function addToWishlist(
        int $userId,
        int $productId
    ): array {

        // Validate product ID
        if ($productId <= 0) {
            return [
                'success' => false,
                'message' => 'Invalid product ID'
            ];
        }

        try {
            // Get product
            $product = $this->productRepository->getById($productId);

            // Check product availability
            if (!$product || (int) $product['is_active'] !== 1) {
                return [
                    'success' => false,
                    'message' => 'Product not available'
                ];
            }

            // Check if product already exists
            $exists = $this->wishlistRepository->isInWishlist(
                $userId,
                $productId
            );

            if ($exists) {
                return [
                    'success' => false,
                    'message' => 'Product already in wishlist'
                ];
            }

            // Add product
            $saved = $this->wishlistRepository->addToWishlist(
                $userId,
                $productId
            );

            if (!$saved) {
                return [
                    'success' => false,
                    'message' => 'Failed to add product to wishlist'
                ];
            }

            return [
                'success' => true,
                'message' => 'Product added to wishlist'
            ];

        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to add product to wishlist'
            ];
        }
    }

    // Remove product from wishlist
    public function removeFromWishlist(
        int $userId,
        int $productId
    ): array {

        // Validate product ID
        if ($productId <= 0) {
            return [
                'success' => false,
                'message' => 'Invalid product ID'
            ];
        }

        try {
            // Check if product exists in user's wishlist
            $exists = $this->wishlistRepository->isInWishlist(
                $userId,
                $productId
            );

            if (!$exists) {
                return [
                    'success' => false,
                    'message' => 'Product not found in wishlist'
                ];
            }

            // Remove product
            $removed = $this->wishlistRepository->removeFromWishlist(
                $userId,
                $productId
            );

            if (!$removed) {
                return [
                    'success' => false,
                    'message' => 'Failed to remove product'
                ];
            }

            return [
                'success' => true,
                'message' => 'Product removed from wishlist'
            ];

        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to remove product'
            ];
        }
    }
}
