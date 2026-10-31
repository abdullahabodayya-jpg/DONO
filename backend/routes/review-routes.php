<?php

declare(strict_types=1);

require_once __DIR__ . '/../app/Repositories/ProductRepository.php';
require_once __DIR__ . '/../app/Repositories/ReviewRepository.php';
require_once __DIR__ . '/../app/Controllers/ReviewController.php';
require_once __DIR__ . '/../app/Middleware/AdminMiddleware.php';

// Initialize Review dependencies
$reviewRepository = new ReviewRepository($database->getConnection());

$reviewProductRepository = new ProductRepository($database->getConnection());

$reviewController = new ReviewController(
    $reviewRepository,
    $reviewProductRepository
);

$reviewAdminMiddleware = new AdminMiddleware();


// ===================================
// PUBLIC PRODUCT REVIEWS
// ===================================

// Get reviews and average rating for a product
$router->get('/api/products/{id}/reviews', function (string $id) use ($reviewController): void {

    // Validate product ID
    $productId = filter_var(
        $id,
        FILTER_VALIDATE_INT,
        ["options" => ["min_range" => 1]]
    );

    if ($productId === false) {
        Response::send(false, "Invalid product ID", null, 422);
        return;
    }

    $reviewController->index($productId);
});


// Submit a review for a product
$router->post('/api/products/{id}/reviews', function (string $id) use ($reviewController): void {

    // Validate product ID
    $productId = filter_var(
        $id,
        FILTER_VALIDATE_INT,
        ["options" => ["min_range" => 1]]
    );

    if ($productId === false) {
        Response::send(false, "Invalid product ID", null, 422);
        return;
    }

    // Authentication is checked inside ReviewController
    $reviewController->store($productId);
});


// ===================================
// ADMIN REVIEW MANAGEMENT
// ===================================

// Get all reviews
$router->get('/api/admin/reviews', function () use ($reviewController, $reviewAdminMiddleware): void {

    // Allow admins only
    $reviewAdminMiddleware->handle();

    $reviewController->adminIndex();
});


// Delete a review
$router->delete('/api/admin/reviews/{id}', function (string $id) use ($reviewController, $reviewAdminMiddleware): void {

    // Allow admins only
    $reviewAdminMiddleware->handle();

    // Validate review ID
    $reviewId = filter_var(
        $id,
        FILTER_VALIDATE_INT,
        ["options" => ["min_range" => 1]]
    );

    if ($reviewId === false) {
        Response::send(false, "Invalid review ID", null, 422);
        return;
    }

    $reviewController->adminDestroy($reviewId);
});