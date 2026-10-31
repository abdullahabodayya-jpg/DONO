<?php

declare(strict_types=1);

return [
    'database' => [
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'dono',
        'username' => 'root',
        'password' => '',
        'charset' => 'utf8mb4',
    ],
    'app' => ['frontend_url' => 'http://localhost/DONO/frontend'],
    'stripe' => [
        'secret_key' => 'sk_test_REPLACE_ME',
        'webhook_secret' => 'whsec_REPLACE_ME',
    ],
    'google' => [
        'client_id' => '',
        'client_secret' => '',
        'redirect_uri' => 'http://localhost/DONO/frontend/google-callback.html',
    ],
];