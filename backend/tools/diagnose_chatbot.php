<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}

require_once __DIR__ . '/../app/Core/EnvLoader.php';
EnvLoader::load(__DIR__ . '/../.env');
EnvLoader::load(__DIR__ . '/../../.env');

$backend = dirname(__DIR__);
$configPath = $backend . '/config/config.php';
$config = is_file($configPath) ? require $configPath : [];
$key = getenv('GEMINI_API_KEY') ?: getenv('GOOGLE_API_KEY') ?: ($config['gemini']['api_key'] ?? '');
$model = getenv('GEMINI_MODEL') ?: ($config['gemini']['model'] ?? 'gemini-2.5-flash');

// All checks are boolean/metadata only. API keys are never printed.
echo "DONO chatbot diagnostics (no secrets displayed)\n";
echo 'backend/.env: ' . (is_file($backend . '/.env') ? 'FOUND' : 'NOT FOUND') . "\n";
echo 'project-root .env: ' . (is_file(dirname($backend) . '/.env') ? 'FOUND' : 'NOT FOUND') . "\n";
echo 'Gemini key: ' . (is_string($key) && trim($key) !== '' && !str_contains($key, 'REPLACE_ME') && !str_contains($key, 'YOUR_') ? 'CONFIGURED' : 'MISSING OR PLACEHOLDER') . "\n";
echo 'Model: ' . (is_string($model) && preg_match('/^[a-zA-Z0-9._-]{3,80}$/', $model) ? $model : 'INVALID') . "\n";
echo 'PHP cURL: ' . (extension_loaded('curl') ? 'ENABLED' : 'DISABLED (enable extension=curl in php.ini)') . "\n";
echo 'Chat route: ' . (is_file($backend . '/routes/chatbot-routes.php') ? 'FOUND' : 'MISSING') . "\n";
echo 'MySQL PDO: ' . (extension_loaded('pdo_mysql') ? 'ENABLED' : 'DISABLED') . "\n";
