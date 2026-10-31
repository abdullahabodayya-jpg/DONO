<?php

declare(strict_types=1);
// Composer manages Stripe SDK autoloading.
$composerAutoload = __DIR__ . '/../vendor/autoload.php';
if (is_file($composerAutoload)) require_once $composerAutoload;
require_once __DIR__ . '/../app/Middleware/AdminMiddleware.php';
require_once __DIR__ . '/../app/Controllers/StripePaymentController.php';

$paymentController = new StripePaymentController($database->getConnection(), $config);

$router->post('/api/payments/checkout', static fn() => $paymentController->checkout());
$router->get('/api/payments/status', static fn() => $paymentController->status());
$router->post('/api/webhook/stripe', static fn() => $paymentController->webhook());
$router->get('/api/admin/payments', static fn() => $paymentController->adminPayments());
$router->post('/api/admin/payments/refund', static fn() => $paymentController->refund());
$router->post('/api/admin/payments/{id}/refund', static function (string $id) use ($paymentController): void {
    if (!ctype_digit($id) || (int) $id < 1) Response::send(false, 'Invalid payment ID.', null, 422);
    $paymentController->refund((int) $id);
});
