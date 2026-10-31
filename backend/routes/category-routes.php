<?php

declare(strict_types=1);

require_once __DIR__ . '/../app/Controllers/CategoryController.php';
$categoryController = new CategoryController($database->getConnection());
$router->get('/api/admin/categories', static fn() => $categoryController->index());
$router->post('/api/admin/categories', static fn() => $categoryController->store());
$router->put('/api/admin/categories/{id}', static fn(string $id) => $categoryController->update($id));
$router->delete('/api/admin/categories/{id}', static fn(string $id) => $categoryController->destroy($id));
