<?php

declare(strict_types=1);

$router->get('/api/health', function () use ($database): void {
    $database->getConnection()->query('SELECT 1');

    Response::success(
        'DONO API is runnung.',
        ['database' => 'connected']
    );
});