<?php

class ReviewController
{
    private ReviewRepository $reviewRepository;
    private ProductRepository $productRepository;

    public function __construct(
        ReviewRepository $reviewRepository,
        ProductRepository $productRepository
    ) {
        $this->reviewRepository = $reviewRepository;
        $this->productRepository = $productRepository;
    }

    // Get current logged-in user ID
    private function getCurrentUserId(): ?int
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        // Use the existing authentication session
        $user = $_SESSION["user"] ?? null;

        if (!is_array($user)) {
            return null;
        }

        $userId = filter_var(
            $user["id"] ?? $user["user_id"] ?? null,
            FILTER_VALIDATE_INT,
            ["options" => ["min_range" => 1]]
        );

        return $userId === false ? null : $userId;
    }

    // Get public reviews for one product
    public function index(int $productId): void
    {
        if ($productId <= 0) {
            Response::send(
                false,
                "Invalid product ID",
                null,
                422
            );
            return;
        }

        try {
            // Only show reviews for available public products
            $product = $this->productRepository->getActiveProductById(
                $productId
            );

            if (!$product) {
                Response::send(
                    false,
                    "Product not found",
                    null,
                    404
                );
                return;
            }

            // Get reviews and rating summary
            $reviews = $this->reviewRepository->getByProductId(
                $productId
            );

            $summary = $this->reviewRepository->getProductRatingSummary(
                $productId
            );

            Response::send(
                true,
                "Product reviews retrieved successfully",
                [
                    "items" => $reviews,
                    "summary" => $summary
                ],
                200
            );

        } catch (Throwable $e) {
            error_log($e->getMessage());

            Response::send(
                false,
                "Failed to retrieve product reviews",
                null,
                500
            );
        }
    }

    // Add a review for a product
    public function store(int $productId): void
    {
        // Check if the user is logged in
        $userId = $this->getCurrentUserId();

        if ($userId === null) {
            Response::send(
                false,
                "Please log in to submit a review",
                null,
                401
            );
            return;
        }

        // Validate product ID
        if ($productId <= 0) {
            Response::send(
                false,
                "Invalid product ID",
                null,
                422
            );
            return;
        }

        // Read JSON request body
        $rawInput = file_get_contents("php://input");
        $input = json_decode($rawInput ?: "", true);

        if (
            !is_array($input) ||
            json_last_error() !== JSON_ERROR_NONE ||
            !str_starts_with(ltrim($rawInput ?: ""), "{")
        ) {
            Response::send(
                false,
                "Invalid JSON data. Expected a JSON object",
                null,
                400
            );
            return;
        }

        // Get review data
        $rating = $input["rating"] ?? null;
        $comment = $input["comment"] ?? null;

        $errors = [];

        // Rating must be an integer from 1 to 5
        if (
            !is_int($rating) ||
            $rating < 1 ||
            $rating > 5
        ) {
            $errors["rating"] = "Rating must be between 1 and 5";
        }

        // Comment is optional
        if ($comment !== null && !is_string($comment)) {
            $errors["comment"] = "Comment must be text";
        } elseif (is_string($comment)) {
            $comment = trim($comment);

            if (mb_strlen($comment, "UTF-8") > 2000) {
                $errors["comment"] = "Comment must not exceed 2000 characters";
            }

            if ($comment === "") {
                $comment = null;
            }
        }

        if (!empty($errors)) {
            Response::send(
                false,
                "Validation failed",
                ["errors" => $errors],
                422
            );
            return;
        }

        try {
            // Check if product exists and is active
            $product = $this->productRepository->getActiveProductById(
                $productId
            );

            if (!$product) {
                Response::send(
                    false,
                    "Product not found",
                    null,
                    404
                );
                return;
            }

            // Allow only one review per user and product
            if ($this->reviewRepository->hasUserReviewed(
                $userId,
                $productId
            )) {
                Response::send(
                    false,
                    "You have already reviewed this product",
                    null,
                    409
                );
                return;
            }

            // Create review in database
            $reviewId = $this->reviewRepository->create(
                $userId,
                $productId,
                $rating,
                $comment
            );

            Response::send(
                true,
                "Review submitted successfully",
                ["id" => $reviewId],
                201
            );

        } catch (PDOException $e) {
            error_log($e->getMessage());

            // Handle duplicate review from database unique constraint
            if (($e->errorInfo[1] ?? null) === 1062) {
                Response::send(
                    false,
                    "You have already reviewed this product",
                    null,
                    409
                );
                return;
            }

            Response::send(
                false,
                "Failed to submit review",
                null,
                500
            );

        } catch (Throwable $e) {
            error_log($e->getMessage());

            Response::send(
                false,
                "Failed to submit review",
                null,
                500
            );
        }
    }

    // Get all reviews for admin management
    public function adminIndex(): void
    {
        try {
            $reviews = $this->reviewRepository->getAll();

            Response::send(
                true,
                "Reviews retrieved successfully",
                ["items" => $reviews],
                200
            );

        } catch (Throwable $e) {
            error_log($e->getMessage());

            Response::send(
                false,
                "Failed to retrieve reviews",
                null,
                500
            );
        }
    }

    // Delete a review as admin
    public function adminDestroy(int $reviewId): void
    {
        if ($reviewId <= 0) {
            Response::send(
                false,
                "Invalid review ID",
                null,
                422
            );
            return;
        }

        try {
            // Check if review exists
            $review = $this->reviewRepository->getById(
                $reviewId
            );

            if (!$review) {
                Response::send(
                    false,
                    "Review not found",
                    null,
                    404
                );
                return;
            }

            // Delete review
            $deleted = $this->reviewRepository->delete(
                $reviewId
            );

            if (!$deleted) {
                Response::send(
                    false,
                    "Review not found or already deleted",
                    null,
                    404
                );
                return;
            }

            Response::send(
                true,
                "Review deleted successfully",
                null,
                200
            );

        } catch (Throwable $e) {
            error_log($e->getMessage());

            Response::send(
                false,
                "Failed to delete review",
                null,
                500
            );
        }
    }
}