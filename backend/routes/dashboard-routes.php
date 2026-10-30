<?php

declare(strict_types=1);

require_once __DIR__ . '/../app/Repositories/DashboardRepository.php';
require_once __DIR__ . '/../app/Controllers/DashboardController.php';
require_once __DIR__ . '/../app/Middleware/AdminMiddleware.php';

// Initialize Dashboard dependencies
$dashboardRepository = new DashboardRepository(
    $database->getConnection()
);

$dashboardController = new DashboardController(
    $dashboardRepository
);

$dashboardAdminMiddleware = new AdminMiddleware();


// ===================================
// ADMIN DASHBOARD API
// ===================================

// Get dashboard statistics and charts
$router->get('/api/admin/dashboard', function () use (
    $dashboardController,
    $dashboardAdminMiddleware
): void {

    // Allow admins only
    $dashboardAdminMiddleware->handle();

    // Get dashboard data
    $dashboardController->index();
});