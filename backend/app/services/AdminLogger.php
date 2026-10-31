<?php

declare(strict_types=1);

/** Best-effort audit log: logging failures must never undo a completed Stripe refund. */
final class AdminLogger
{
    private static ?PDO $database = null;

    public static function configure(PDO $database): void
    {
        self::$database = $database;
    }

    public function log(string $action, array $context = []): void
    {
        if (!self::$database) {
            error_log('DONO admin log unavailable: no database connection. Action: ' . $action);
            return;
        }
        try {
            $stmt = self::$database->prepare('INSERT INTO admin_logs (admin_id,action,context) VALUES (?,?,?)');
            $stmt->execute([
                isset($_SESSION['user']['id']) ? (int)$_SESSION['user']['id'] : null,
                substr($action, 0, 100),
                json_encode($context, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE),
            ]);
        } catch (Throwable $e) {
            error_log('DONO admin log failed: ' . $e->getMessage());
        }
    }
}
