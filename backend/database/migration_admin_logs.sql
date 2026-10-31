-- DONO administrator audit logs. Additive migration; execute once before opening Admin Logs.
CREATE TABLE IF NOT EXISTS `admin_logs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `admin_id` INT NULL,
    `action` VARCHAR(100) NOT NULL,
    `context` JSON DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_admin_logs_created` (`created_at`),
    INDEX `idx_admin_logs_admin` (`admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
