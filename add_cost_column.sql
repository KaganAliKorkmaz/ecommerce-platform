-- Add cost column to products table
ALTER TABLE `products`
ADD COLUMN `cost` decimal(10,2) DEFAULT NULL AFTER `price`; 