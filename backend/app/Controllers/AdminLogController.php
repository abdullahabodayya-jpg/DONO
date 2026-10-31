<?php

declare(strict_types=1);

final class AdminLogController
{
    public function __construct(private PDO $db) {}

    public function index(): void
    {
        (new AdminMiddleware())->handle();
        try {
            $rows = $this->db->query('SELECT id,admin_id,action,context,created_at FROM admin_logs ORDER BY id DESC LIMIT 100')->fetchAll(PDO::FETCH_ASSOC);
            Response::success('Recent admin actions.', $rows);
        } catch (PDOException $e) {
            error_log('Admin logs unavailable: ' . $e->getMessage());
            Response::send(false, 'Admin logging migration is required. Apply migration_admin_logs.sql.', null, 503);
        }
    }
}
