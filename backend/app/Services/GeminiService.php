<?php

declare(strict_types=1);

namespace App\Services;

class GeminiService
{
    private string $apiKey;
    private array $models = [
        'gemini-3.5-flash',
        'gemini-3.1-pro-preview'
    ];

    public function __construct(string $apiKey)
    {
        $this->apiKey = $apiKey;
    }

    public function searchAndRecommend(string $userMessage, array $productsCatalog): array
    {
        $systemInstruction = "You are an e-commerce shopping assistant. Analyze user inquiries, identify preferences or budget limits, and select the closest matches from the provided catalog. Always respond strictly in valid JSON format using this schema:
{
  \"reply\": \"Concise and friendly response to the customer in English\",
  \"matched_products\": [
    {
      \"id\": 1,
      \"name\": \"Product Name\",
      \"category\": \"Category Name\"
    }
  ]
}";

        $payload = [
            "system_instruction" => [
                "parts" => [["text" => $systemInstruction]]
            ],
            "contents" => [
                [
                    "role" => "user",
                    "parts" => [
                        [
                            "text" => "Catalog: " . json_encode($productsCatalog, JSON_UNESCAPED_SLASHES) . "\nCustomer: " . $userMessage
                        ]
                    ]
                ]
            ],
            "generationConfig" => [
                "response_mime_type" => "application/json",
                "temperature" => 0.2
            ]
        ];

        $lastError = '';

        foreach ($this->models as $model) {
            $apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$this->apiKey}";

            $ch = curl_init($apiUrl);
            curl_setopt_array($ch, [
                CURLOPT_POST           => true,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
                CURLOPT_POSTFIELDS     => json_encode($payload),
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_TIMEOUT        => 15
            ]);

            $response = curl_exec($ch);
            $curlErr  = curl_error($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($curlErr) {
                $lastError = "cURL Connection Error: " . $curlErr;
                continue;
            }

            $result = json_decode((string)$response, true);

            if (isset($result['error'])) {
                $lastError = "Google API Error (" . ($result['error']['code'] ?? $httpCode) . "): " . ($result['error']['message'] ?? 'Service overloaded');
                if (($result['error']['code'] ?? $httpCode) == 503) {
                    continue;
                }
                break;
            }

            $rawText = $result['candidates'][0]['content']['parts'][0]['text'] ?? null;
            if ($rawText) {
                $decoded = json_decode($rawText, true);
                if (is_array($decoded)) {
                    return $decoded;
                }
            }
        }

        return [
            'reply' => !empty($lastError) ? $lastError : "All AI models are currently busy. Please try again in a few moments.",
            'matched_products' => []
        ];
    }
}