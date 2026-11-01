<?php

declare(strict_types=1);

/** Team chatbot integrated with existing DONO auth-independent catalog and PDO connection. */
final class ChatbotController
{
    public function __construct(private PDO $pdo, private array $config) {}

    public function handleChat(): void
    {
        $raw = (string)file_get_contents('php://input');
        $data = json_decode($raw, true);
        $message = is_array($data) ? ($data['message'] ?? null) : null;
        if (!is_string($message) || trim($message) === '' || (function_exists('mb_strlen') ? mb_strlen($message) : strlen($message)) > 500) {
            Response::send(false, 'Enter a message between 1 and 500 characters.', null, 422);
        }
        // Basic per-browser-session limit. Apply server-level rate limits in production.
        $now = time();
        $recent = array_values(array_filter($_SESSION['dono_chat_requests'] ?? [], static fn($t) => is_int($t) && $t > $now - 60));
        if (count($recent) >= 12) {
            Response::send(false, 'Too many requests. Try again shortly.', null, 429);
        }
        $recent[] = $now;
        $_SESSION['dono_chat_requests'] = $recent;

        // Prefer server-side environment secrets over optional local config.php values.
        $apiKey = getenv('GEMINI_API_KEY');
        if (!is_string($apiKey) || trim($apiKey) === '') {
            $apiKey = getenv('GOOGLE_API_KEY');
        }
        if (!is_string($apiKey) || trim($apiKey) === '') {
            $apiKey = $this->config['gemini']['api_key'] ?? '';
        }
        if (!is_string($apiKey) || trim($apiKey) === '' || str_contains($apiKey, 'REPLACE_ME') || str_contains($apiKey, 'YOUR_GEMINI_API_KEY_HERE')) {
            Response::send(false, 'Shopping assistant is not configured. Set GEMINI_API_KEY in backend/.env.', null, 503);
        }
        $apiKey = trim($apiKey);

        try {
            // Only recommend real, active products; reuse current project's database + images.
            $catalog = $this->pdo->query(
                "SELECT p.id,p.name,p.price,p.product_type,LEFT(COALESCE(p.description,''),240) AS description,
                        pi.image_url
                 FROM products p
                 LEFT JOIN product_images pi ON pi.product_id=p.id AND pi.is_primary=1
                 WHERE p.is_active=1 AND p.deleted_at IS NULL
                 ORDER BY p.created_at DESC,p.id DESC LIMIT 80"
            )->fetchAll(PDO::FETCH_ASSOC);
            if (!$catalog) {
                Response::success('No products available.', ['reply' => 'No gifts are available in our catalog yet.', 'products' => []]);
            }
            $model = (string)(getenv('GEMINI_MODEL') ?: ($this->config['gemini']['model'] ?? 'gemini-2.5-flash'));
            if (!preg_match('/^[a-zA-Z0-9._-]{3,80}$/', $model)) $model = 'gemini-2.5-flash';
            $gemini = new GeminiService($apiKey, $model);
            $result = $gemini->searchAndRecommend(trim($message), $catalog);
            $index = [];
            foreach ($catalog as $product) $index[(int)$product['id']] = $product;
            $selected = [];
            foreach ($result['product_ids'] as $id) {
                if (isset($index[$id])) $selected[] = $index[$id];
            }
            Response::success('Recommendation ready.', [
                'reply' => $result['reply'],
                'products' => $selected,
            ]);
        } catch (GeminiServiceException $e) {
            // Only safe, predefined messages are returned to visitors.
            error_log('DONO chatbot provider issue: ' . $e->getMessage());
            Response::send(false, $e->getMessage(), null, $e->httpStatus());
        } catch (Throwable $e) {
            // Avoid logging raw provider replies or secrets.
            error_log('DONO chatbot unexpected failure; error_type=' . get_class($e));
            Response::send(false, 'Shopping assistant is temporarily unavailable. Please try again.', null, 503);
        }
    }
}
