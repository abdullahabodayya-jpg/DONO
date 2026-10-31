<?php

declare(strict_types=1);

/** Team chatbot Gemini integration, adapted for DONO's existing PHP router. */
final class GeminiService
{
    public function __construct(private string $apiKey, private string $model = 'gemini-2.5-flash') {}

    public function searchAndRecommend(string $message, array $catalog): array
    {
        if (!extension_loaded('curl')) {
            throw new RuntimeException('The PHP cURL extension is not enabled.');
        }
        $allowedIds = array_map(static fn(array $p): int => (int)$p['id'], $catalog);
        $system = 'You are DONO shopping assistant. Answer politely and briefly. '
            . 'Recommend products ONLY from the supplied catalog. '
            . 'Do not invent product names, prices, or IDs. '
            . 'Respond with valid JSON with fields "reply" (string) and "matched_products" '
            . '(array of objects each having an integer "id"). Recommend at most five products. '
            . 'Reply in the same language as the customer when possible.';
        $payload = [
            'system_instruction' => ['parts' => [['text' => $system]]],
            'contents' => [['role' => 'user', 'parts' => [[
                'text' => 'Store catalog: ' . json_encode($catalog, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE)
                    . "\nCustomer request: " . $message,
            ]]]],
            'generationConfig' => ['responseMimeType' => 'application/json', 'temperature' => 0.2],
        ];
        $url = 'https://generativelanguage.googleapis.com/v1beta/models/'
            . rawurlencode($this->model) . ':generateContent';
        $handle = curl_init($url);
        if ($handle === false) throw new RuntimeException('Cannot initialize chatbot request.');
        curl_setopt_array($handle, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'x-goog-api-key: ' . $this->apiKey],
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE),
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 25,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);
        $response = curl_exec($handle);
        $httpCode = (int)curl_getinfo($handle, CURLINFO_HTTP_CODE);
        $curlError = curl_error($handle);
        curl_close($handle);
        if (!is_string($response) || $curlError !== '' || $httpCode < 200 || $httpCode >= 300) {
            error_log('DONO chatbot provider request failed; http_code=' . $httpCode . '; curl=' . ($curlError !== '' ? 'connection_failed' : 'none'));
            throw new RuntimeException('Shopping assistant is temporarily unavailable. Please try again.');
        }
        $body = json_decode($response, true);
        $raw = $body['candidates'][0]['content']['parts'][0]['text'] ?? '';
        $result = is_string($raw) ? json_decode($raw, true) : null;
        if (!is_array($result) || !is_string($result['reply'] ?? null)) {
            throw new RuntimeException('Shopping assistant returned an unexpected response.');
        }
        $matched = [];
        foreach (($result['matched_products'] ?? []) as $item) {
            $id = filter_var(is_array($item) ? ($item['id'] ?? null) : null, FILTER_VALIDATE_INT);
            if ($id !== false && in_array($id, $allowedIds, true) && !in_array($id, $matched, true)) $matched[] = $id;
            if (count($matched) >= 5) break;
        }
        return ['reply' => (function_exists('mb_substr') ? mb_substr(trim($result['reply']), 0, 1200) : substr(trim($result['reply']), 0, 1200)), 'product_ids' => $matched];
    }
}
