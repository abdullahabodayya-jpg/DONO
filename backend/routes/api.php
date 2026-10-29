<?php

declare(strict_types=1);

$router->get('/api/health', function () use ($database): void {
    $database->getConnection()->query('SELECT 1');

    Response::success(
        'DONO API is runnung.',
        ['database' => 'connected']
    );
});

$router->post('/api/coupons/validate', function () use ($database): void {
    $rawBody = file_get_contents('php://input');
    $body = json_decode($rawBody, true);

    if (!is_array($body)) {
        Response::send(
            false,
            'Invalid JSON request body.',
            null,
            400
        );
    }

    $code = $body['code'] ?? null;
    $subtotal = $body['subtotal'] ?? null;

    if (!is_string($code) || trim($code) === '') {
        Response::send(
            false,
            'Coupon code is required.',
            null,
            422
        );
    }

    if (
        (!is_int($subtotal) && !is_float($subtotal))
        || !is_finite((float) $subtotal)
        || $subtotal <= 0
    ) {
        Response::send(
            false,
            'Subtotal must be a positive number.',
            null,
            422
        );
    }

    $code = trim($code);
    $subtotal = round((float) $subtotal, 2);

    $pdo = $database->getConnection();

    $statement = $pdo->prepare(
        'SELECT id, code, discount_type, discount_value,
                min_order_amount, start_date, end_date, is_active
         FROM coupons
         WHERE code = :code
         LIMIT 1'
    );

    $statement->execute(['code' => $code]);
    $coupon = $statement->fetch();

    if ($coupon === false) {
        Response::send(
            false,
            'Coupon not found.',
            null,
            404
        );
    }

    if ((int) $coupon['is_active'] !== 1) {
        Response::send(
            false,
            'Coupon is inactive.',
            null,
            422
        );
    }

    $now = new DateTimeImmutable();
    $startDate = new DateTimeImmutable($coupon['start_date']);
    $endDate = new DateTimeImmutable($coupon['end_date']);

    if ($now < $startDate || $now > $endDate) {
        Response::send(
            false,
            'Coupon is outside its validity period.',
            null,
            422
        );
    }

    if ($subtotal < (float) $coupon['min_order_amount']) {
        Response::send(
            false,
            'Order subtotal does not meet the minimum amount.',
            null,
            422
        );
    }

    $discountValue = (float) $coupon['discount_value'];

    if ($coupon['discount_type'] === 'percentage') {
        if ($discountValue <= 0 || $discountValue > 100) {
            Response::send(
                false,
                'Coupon discount configuration is invalid.',
                null,
                500
            );
        }

        $discountAmount = $subtotal * ($discountValue / 100);
    } elseif ($coupon['discount_type'] === 'fixed') {
        if ($discountValue <= 0) {
            Response::send(
                false,
                'Coupon discount configuration is invalid.',
                null,
                500
            );
        }

        $discountAmount = $discountValue;
    } else {
        Response::send(
            false,
            'Coupon discount configuration is invalid.',
            null,
            500
        );
    }

    $discountAmount = round(
        min($discountAmount, $subtotal),
        2
    );

    $totalAfterDiscount = round(
        $subtotal - $discountAmount,
        2
    );

    Response::success(
        'Coupon applied successfully.',
        [
            'code' => $coupon['code'],
            'discount_type' => $coupon['discount_type'],
            'discount_value' => $discountValue,
            'discount_amount' => $discountAmount,
            'subtotal' => $subtotal,
            'total_after_discount' => $totalAfterDiscount,
        ]
    );
});


// ========================================
// CART API ROUTES
// ========================================

// Load the CartController class
require_once __DIR__ . '/../app/Controllers/CartController.php';

// Create CartController and pass the database connection
$cartController = new CartController($database->getConnection());


// ----------------------------------------
// GET CART
// ----------------------------------------

// Get the current user's cart
$router->get('/api/cart', function (): void {

    // Authentication is required before accessing the cart
    Response::send(
        false,
        'Authentication required.',
        null,
        401
    );
});


// ----------------------------------------
// ADD TO CART
// ----------------------------------------

// Add a product to the current user's cart
$router->post('/api/cart', function (): void {

    // Prevent adding products without authentication
    Response::send(
        false,
        'Authentication required.',
        null,
        401
    );
});


// ----------------------------------------
// UPDATE CART QUANTITY
// ----------------------------------------

// Update the quantity of a product in the cart
$router->put('/api/cart/items', function (): void {

    // Prevent cart updates without authentication
    Response::send(
        false,
        'Authentication required.',
        null,
        401
    );
});


// ----------------------------------------
// REMOVE FROM CART
// ----------------------------------------

// Remove a product from the cart
$router->delete('/api/cart/items', function (): void {

    // Prevent deleting cart items without authentication
    Response::send(
        false,
        'Authentication required.',
        null,
        401
    );
});