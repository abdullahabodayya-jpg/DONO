<?php
/** CLI-only local setup diagnosis. Does not expose secret keys. */
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}
$root = dirname(__DIR__);
$configPath = $root . '/config/config.php';
$autoload = $root . '/vendor/autoload.php';
echo "DONO environment diagnosis\n";
echo 'PHP: ' . PHP_VERSION . "\n";
echo 'PDO MySQL: ' . (extension_loaded('pdo_mysql') ? 'OK' : 'MISSING (enable pdo_mysql in php.ini)') . "\n";
echo 'Config: ' . (is_file($configPath) ? 'OK' : 'MISSING (copy config.example.php)') . "\n";
echo 'Composer packages: ' . (is_file($autoload) ? 'FOUND' : 'MISSING (run composer install in backend/)') . "\n";
if (is_file($autoload)) {
    require_once $autoload;
    echo 'Stripe SDK: ' . (class_exists(\Stripe\Stripe::class) ? 'OK' : 'MISSING') . "\n";
}
if (!is_file($configPath)) {
    echo "Database and Stripe credentials: NOT CHECKED (config file missing)\n";
    exit(1);
}
$config = require $configPath;
if (!is_array($config)) {
    echo "Config contents: INVALID\n";
    exit(1);
}
$key = $config['stripe']['secret_key'] ?? '';
$webhook = $config['stripe']['webhook_secret'] ?? '';
echo 'Stripe secret key: ' . (is_string($key) && preg_match('/^sk_(test|live)_/', $key) && !str_contains($key, 'REPLACE_ME') ? 'SET' : 'MISSING / PLACEHOLDER') . "\n";
echo 'Webhook signing secret: ' . (is_string($webhook) && str_starts_with($webhook, 'whsec_') && !str_contains($webhook, 'REPLACE_ME') ? 'SET' : 'MISSING / PLACEHOLDER') . "\n";
if (extension_loaded('pdo_mysql')) {
    try {
        $db = $config['database'];
        $connection = new PDO(sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $db['host'], $db['port'], $db['name'], $db['charset']), $db['username'], $db['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        echo "MySQL connection: OK\n";
        $refunds = $connection->query("SHOW TABLES LIKE 'payment_refunds'")->fetchColumn();
        echo 'Refund migration: ' . ($refunds ? 'APPLIED' : 'MISSING (optional for listing, required for refunds)') . "\n";
        echo "Admin activity log table: NOT REQUIRED\n";
    } catch (Throwable $e) {
        echo "MySQL connection: FAILED (inspect local XAMPP settings; details kept private)\n";
    }
}
