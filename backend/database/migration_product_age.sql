-- Run once on an existing DONO database before using age search.
-- NULL represents unclassified products; they remain visible under All ages.
ALTER TABLE products ADD COLUMN age_min TINYINT UNSIGNED NULL DEFAULT NULL,
                     ADD COLUMN age_max TINYINT UNSIGNED NULL DEFAULT NULL;
-- In phpMyAdmin update appropriate gifts with genuine suitable ages (0–120).
-- Example only (replace ID and age values for actual products):
-- UPDATE products SET age_min=13,age_max=18 WHERE id=123;
