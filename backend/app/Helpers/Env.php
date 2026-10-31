<?php

declare(strict_types=1);

namespace App\Helpers;

class Env
{
    public static function get(string $key, ?string $default = null): ?string
    {
        $envPath = dirname(__DIR__, 3) . '/.env';

        if (file_exists($envPath)) {
            $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line) || str_starts_with($line, '#')) {
                    continue;
                }
                if (str_contains($line, '=')) {
                    [$envKey, $envValue] = explode('=', $line, 2);
                    if (trim($envKey) === $key) {
                        return trim($envValue);
                    }
                }
            }
        }

        return getenv($key) !== false ? (string)getenv($key) : $default;
    }
}