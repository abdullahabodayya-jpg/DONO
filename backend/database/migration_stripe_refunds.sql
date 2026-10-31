-- DONO Stripe refund tracking; run once on existing databases (do not re-import full schema).
CREATE TABLE IF NOT EXISTS `payment_refunds` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_id` int NOT NULL,
  `stripe_refund_id` varchar(255) DEFAULT NULL,
  `status` enum('pending','succeeded','failed') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_payment_full_refund` (`payment_id`),
  UNIQUE KEY `uniq_stripe_refund` (`stripe_refund_id`),
  CONSTRAINT `fk_payment_refunds_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
