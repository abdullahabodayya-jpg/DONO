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
    // Obtain a Gemini API key for the team's shopping assistant. Never commit real keys.
    'gemini' => ['api_key' => '', 'model' => 'gemini-2.5-flash'],
    'google' => [
        'client_id' => '',
        'client_secret' => '',
        // For localhost the controller derives the exact project path automatically.
        // For production set the registered full redirect URI here.
        'redirect_uri' => '',
    ],
];