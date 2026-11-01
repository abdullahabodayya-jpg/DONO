<?php

declare(strict_types=1);

require_once __DIR__ . '/../app/services/GeminiService.php';
require_once __DIR__ . '/../app/Controllers/ChatbotController.php';
$chatbotController = new ChatbotController($database->getConnection(), $config);
$router->post('/api/chat', static fn() => $chatbotController->handleChat());
