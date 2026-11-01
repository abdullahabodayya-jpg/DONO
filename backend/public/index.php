<?php

declare(strict_types =1);

header('Content-Type: application/json; charset=utf-8');
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../app/Core/Database.php';
require_once __DIR__ . '/../app/Core/Router.php';
require_once __DIR__ . '/../app/Core/Response.php';
require_once __DIR__ . '/../app/Core/EnvLoader.php';

// Load local secrets on the server, never from the browser.
// backend/.env takes precedence over a project-root .env when both exist.
EnvLoader::load(__DIR__ . '/../.env');
EnvLoader::load(__DIR__ . '/../../.env');

$config  = require __DIR__ . '/../config/config.php';

try {
    $database = new Database($config);
    $router = new Router();

    require __DIR__ . '/../routes/api.php';

    $method = $_SERVER['REQUEST_METHOD'];

    // Normalize API URLs independently of Apache's rewritten SCRIPT_NAME.
    // For example, both /DONO/backend/public/api/auth/google/url and
    // /Long-XAMPP-Folder/DONO/backend/public/api/auth/google/url must dispatch
    // to the same internal route: /api/auth/google/url.
    $rawPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH);
    if (!is_string($rawPath)) {
        Response::send(false, 'Invalid request path.', null, 400);
    }

    $rawPath = rawurldecode($rawPath);
    $publicPath = '/backend/public';
    $publicPos = strpos($rawPath, $publicPath . '/');
    if ($publicPos === false && str_ends_with($rawPath, $publicPath)) {
        $publicPos = strlen($rawPath) - strlen($publicPath);
    }

    if ($publicPos !== false) {
        $routePath = substr($rawPath, $publicPos + strlen($publicPath));
    } else {
        // Fallback for custom Apache aliases, if any.
        $basePath = rtrim(str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? ''))), '/');
        $routePath = ($basePath !== '' && ($rawPath === $basePath || str_starts_with($rawPath, $basePath . '/')))
            ? substr($rawPath, strlen($basePath))
            : $rawPath;
    }

    $requestPath = '/' . trim($routePath, '/');

    $router->dispatch($method, $requestPath);
} catch (Throwable $e) {
    error_log(
        "ERROR: " . $e->getMessage() .
        " | FILE: " . $e->getFile() .
        " | LINE: " . $e->getLine()
    );

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Internal server error.',
    ]);
}