<?php

declare(strict_types=1);

require_once __DIR__ . '/../app/Repositories/CouponRepository.php';
require_once __DIR__ . '/../app/Controllers/CouponController.php';


$router->get('/api/health', function () use ($database): void {
    $database->getConnection()->query('SELECT 1');

    Response::success(
        'DONO API is running.',
        ['database' => 'connected']
    );
});

$couponController = new CouponController($database);


$router->get('/api/coupons', function () use ($couponController): void {
    $couponController->index();
});


$router->get('/api/coupons/{id}', function (string $id) use ($couponController): void {
    $couponController->show($id);
});


$router->post('/api/coupons', function () use ($couponController): void {
    $couponController->store();
});

$router->put('/api/coupons/{id}', function (string $id) use ($couponController): void {
    $couponController->update($id);
});

$router->patch('/api/coupons/{id}', function (string $id) use ($couponController): void {
    $couponController->patch($id);
});

$router->delete('/api/coupons/{id}', function (string $id) use ($couponController): void {
    $couponController->destroy($id);
});


$router->post('/api/coupons/validate', function () use ($couponController): void {
    $couponController->validateCoupon();
});