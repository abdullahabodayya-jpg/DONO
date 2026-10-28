<?php

declare(strict_types =1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../app/Core/Database.php';
require_once __DIR__ . '/../app/Core/Router.php';
require_once __DIR__ . '/../app/Core/Response.php';

$config  = require __DIR__ . '/../config/config.php';

try {
    $database = new Database($config);
    $router = new Router();

    require __DIR__ . '/../routes/api.php';

    $method = $_SERVER['REQUEST_METHOD'];

    $requestPath = parse_url(
    $_SERVER['REQUEST_URI'],
    PHP_URL_PATH
);

if (!is_string($requestPath)) {
    http_response_code(400);

    echo json_encode([
        'success' => false,
        'message' => 'Invalid request path.',
    ]);

    exit;
}


    $basePath = rtrim(
        str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])),
        '/'
    );

    if ($basePath !== '' && str_starts_with($requestPath, $basePath)) {
        $requestPath = substr($requestPath, strlen($basePath));
    }

    $requestPath = '/' . trim($requestPath, '/');

    $router->dispatch($method, $requestPath);
} catch (Throwable $e){
    error_log($e->getMessage());

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Internal server error.',
    ]);

}