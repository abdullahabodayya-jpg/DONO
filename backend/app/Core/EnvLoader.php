<?php

declare(strict_types=1);

/**
 * Minimal local .env reader for XAMPP without an additional Composer dependency.
 * Never logs variable values. Existing server environment variables take priority.
 */
final class EnvLoader
{
    public static function load(string $file): void
    {
        if (!is_file($file) || !is_readable($file)) {
            return;
        }

        $lines = file($file, FILE_IGNORE_NEW_LINES);
        if ($lines === false) {
            throw new RuntimeException('Unable to read local environment configuration.');
        }

        foreach ($lines as $line) {
            $line = trim($line, " \t\n\r\0\x0B\xEF\xBB\xBF");
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            if (str_starts_with($line, 'export ')) {
                $line = trim(substr($line, 7));
            }
            if (!preg_match('/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/', $line, $matches)) {
                continue;
            }

            $name = $matches[1];
            $value = trim($matches[2]);
            if (strlen($value) >= 2 && ($value[0] === '"' || $value[0] === "'") && substr($value, -1) === $value[0]) {
                $value = substr($value, 1, -1);
            } else {
                // Inline comments only after whitespace, so hashes within keys survive.
                $value = preg_replace('/\s+#.*$/', '', $value) ?? $value;
                $value = rtrim($value);
            }

            if (getenv($name) !== false || array_key_exists($name, $_ENV)) {
                continue;
            }
            putenv($name . '=' . $value);
            $_ENV[$name] = $value;
        }
    }
}
