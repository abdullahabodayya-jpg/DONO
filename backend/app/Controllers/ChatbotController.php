<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\GeminiService;
use App\Helpers\Env;
use PDO;
use PDOException;

class ChatbotController
{
    private ?PDO $db = null;
    private ?string $dbError = null;

    public function __construct(?PDO $db = null)
    {
        if ($db !== null) {
            $this->db = $db;
            return;
        }

        if (class_exists('\App\Core\Database')) {
            $instance = \App\Core\Database::getInstance();
            if (method_exists($instance, 'getConnection')) {
                $conn = $instance->getConnection();
                if ($conn instanceof PDO) {
                    $this->db = $conn;
                    return;
                }
            }
        }

        $host = Env::get('DB_HOST') ?: '127.0.0.1';
        $dbname = Env::get('DB_NAME') ?: 'dono';
        $user = Env::get('DB_USER') ?: 'root';
        $pass = Env::get('DB_PASS') !== false && Env::get('DB_PASS') !== null ? Env::get('DB_PASS') : '';

        try {
            $this->db = new PDO(
                "mysql:host={$host};dbname={$dbname};charset=utf8mb4",
                $user,
                $pass,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ]
            );
        } catch (PDOException $e) {
            $this->db = null;
            $this->dbError = $e->getMessage();
        }
    }

    public function handleChat(): void
    {
        header('Content-Type: application/json; charset=utf-8');

        if (!$this->db) {
            http_response_code(500);
            echo json_encode([
                'error' => 'Database connection failed',
                'details' => $this->dbError
            ]);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $userMessage = trim($input['message'] ?? '');

        if (empty($userMessage)) {
            http_response_code(400);
            echo json_encode(['error' => 'Message is required']);
            return;
        }

        $stmt = $this->db->query("SELECT id, name, price, product_type, description FROM products LIMIT 50");
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($products)) {
            echo json_encode([
                'reply' => 'No products found in the database.',
                'products' => []
            ]);
            return;
        }

        $apiKey = Env::get('GEMINI_API_KEY');
        if (!$apiKey) {
            http_response_code(500);
            echo json_encode(['error' => 'Gemini API key is not configured']);
            return;
        }

        $gemini = new GeminiService($apiKey);
        $analysis = $gemini->searchAndRecommend($userMessage, $products);

        $detailedProducts = [];
        if (!empty($analysis['matched_products'])) {
            $ids = array_column($analysis['matched_products'], 'id');
            $placeholders = implode(',', array_fill(0, count($ids), '?'));

            $stmt = $this->db->prepare("SELECT id, name, price, product_type, description FROM products WHERE id IN ($placeholders)");
            $stmt->execute($ids);
            $detailedProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($detailedProducts as &$prod) {
                $prod['main_image'] = '/dono/frontend/assets/img/default.png';
            }
        }

        echo json_encode([
            'reply' => $analysis['reply'] ?? '',
            'products' => $detailedProducts
        ]);
    }
}