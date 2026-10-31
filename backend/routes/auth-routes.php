<?php

declare(strict_types=1);

require_once __DIR__ . '/../app/Repositories/UserRepository.php';
require_once __DIR__ . '/../app/Controllers/AuthController.php';
require_once __DIR__ . '/../app/Controllers/UserController.php';
require_once __DIR__ . '/../app/Controllers/ProfileController.php';

$authController = new AuthController($database->getConnection(), $config);
$router->post('/api/auth/register', static fn() => $authController->register());
$router->post('/api/auth/login', static fn() => $authController->login());
$router->post('/api/auth/logout', static fn() => $authController->logout());
$router->get('/api/auth/google/url', static fn() => $authController->getGoogleAuthUrl());
$router->post('/api/auth/google/callback', static fn() => $authController->handleGoogleCallback());
$router->post('/api/auth/complete-profile', static fn() => $authController->completeProfile());
$router->get('/api/auth/me', static function (): void {
    if (empty($_SESSION['user'])) Response::send(false, 'Authentication required.', null, 401);
    Response::success('Authenticated user.', ['user' => $_SESSION['user']]);
});
$router->get('/api/admin/users', static fn() => (new UserController($database->getConnection()))->index());
$router->get('/api/admin/users/{id}', static function (string $id) use ($database): void {
    (new AdminMiddleware())->handle();
    if (!ctype_digit($id) || (int)$id < 1) Response::send(false, 'Invalid user ID.', null, 422);
    (new UserController($database->getConnection()))->show((int)$id);
});
$router->put('/api/admin/users/{id}', static function (string $id) use ($database): void {
    (new AdminMiddleware())->handle();
    if (!ctype_digit($id) || (int)$id < 1) Response::send(false, 'Invalid user ID.', null, 422);
    (new UserController($database->getConnection()))->update((int)$id);
});

$profileController = new ProfileController($database->getConnection());
$router->get('/api/profile', static fn() => $profileController->show());
$router->put('/api/profile', static fn() => $profileController->update());
$router->post('/api/profile/password', static fn() => $profileController->password());
