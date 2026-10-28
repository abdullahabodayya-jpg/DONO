-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 28, 2026 at 01:49 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `dono`
--

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `coupons`
--

CREATE TABLE `coupons` (
  `id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `discount_type` enum('percentage','fixed') NOT NULL,
  `discount_value` decimal(10,2) NOT NULL,
  `min_order_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ;

-- --------------------------------------------------------

--
-- Table structure for table `custom_orders`
--

CREATE TABLE `custom_orders` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `order_item_id` int(11) DEFAULT NULL,
  `prompt` text NOT NULL,
  `design_image_url` varchar(255) DEFAULT NULL,
  `preview_image_url` varchar(255) DEFAULT NULL,
  `status` enum('pending','generating','completed','failed') NOT NULL DEFAULT 'pending',
  `customization_notes` text DEFAULT NULL,
  `extra_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `gift_box_items`
--

CREATE TABLE `gift_box_items` (
  `id` int(11) NOT NULL,
  `order_item_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `coupon_id` int(11) DEFAULT NULL,
  `order_number` varchar(30) NOT NULL,
  `status` enum('cart','pending','confirmed','cancelled') NOT NULL DEFAULT 'cart',
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `shipping_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `order_gift_details`
--

CREATE TABLE `order_gift_details` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `recipient_name` varchar(100) NOT NULL,
  `recipient_phone` varchar(20) NOT NULL,
  `recipient_address` varchar(255) NOT NULL,
  `gift_message` text DEFAULT NULL,
  `hide_price` tinyint(1) NOT NULL DEFAULT 1,
  `wrapping_type` varchar(50) DEFAULT NULL,
  `wrapping_fee` decimal(10,2) NOT NULL DEFAULT 0.00
) ;

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `product_name` varchar(150) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `line_total` decimal(10,2) NOT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `provider` varchar(50) DEFAULT NULL,
  `provider_reference` varchar(255) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` enum('pending','succeeded','failed','refunded') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `stock_quantity` int(11) NOT NULL DEFAULT 0,
  `product_type` enum('normal','package','custom_box') NOT NULL DEFAULT 'normal',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `product_images`
--

CREATE TABLE `product_images` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

CREATE TABLE `reviews` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `rating` int(11) NOT NULL,
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `gender` enum('male','female') DEFAULT NULL,
  `address` text DEFAULT NULL,
  `role` enum('customer','admin') NOT NULL DEFAULT 'customer',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `wishlist_items`
--

CREATE TABLE `wishlist_items` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `coupons`
--
ALTER TABLE `coupons`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `custom_orders`
--
ALTER TABLE `custom_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_item_id` (`order_item_id`),
  ADD KEY `fk_custom_orders_user` (`user_id`),
  ADD KEY `fk_custom_orders_product` (`product_id`);

--
-- Indexes for table `gift_box_items`
--
ALTER TABLE `gift_box_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_gift_box_order_item` (`order_item_id`),
  ADD KEY `fk_gift_box_product` (`product_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_number` (`order_number`),
  ADD KEY `fk_orders_user` (`user_id`),
  ADD KEY `fk_orders_coupon` (`coupon_id`);

--
-- Indexes for table `order_gift_details`
--
ALTER TABLE `order_gift_details`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_id` (`order_id`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_order_product` (`order_id`,`product_id`),
  ADD KEY `fk_order_items_product` (`product_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_payments_order` (`order_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_products_category` (`category_id`);

--
-- Indexes for table `product_images`
--
ALTER TABLE `product_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_product_images_product` (`product_id`);

--
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_review_user_product` (`user_id`,`product_id`),
  ADD KEY `fk_reviews_product` (`product_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `wishlist_items`
--
ALTER TABLE `wishlist_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_wishlist_user_product` (`user_id`,`product_id`),
  ADD KEY `fk_wishlist_product` (`product_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `coupons`
--
ALTER TABLE `coupons`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `custom_orders`
--
ALTER TABLE `custom_orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `gift_box_items`
--
ALTER TABLE `gift_box_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_gift_details`
--
ALTER TABLE `order_gift_details`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_images`
--
ALTER TABLE `product_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `wishlist_items`
--
ALTER TABLE `wishlist_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `custom_orders`
--
ALTER TABLE `custom_orders`
  ADD CONSTRAINT `fk_custom_orders_order_item` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_custom_orders_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_custom_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `gift_box_items`
--
ALTER TABLE `gift_box_items`
  ADD CONSTRAINT `fk_gift_box_order_item` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_gift_box_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `order_gift_details`
--
ALTER TABLE `order_gift_details`
  ADD CONSTRAINT `fk_gift_details_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `fk_payments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `product_images`
--
ALTER TABLE `product_images`
  ADD CONSTRAINT `fk_product_images_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `fk_reviews_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reviews_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `wishlist_items`
--
ALTER TABLE `wishlist_items`
  ADD CONSTRAINT `fk_wishlist_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_wishlist_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
