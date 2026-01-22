-- Use the database
USE online_store;

-- Add cost field to products table if it doesn't exist
ALTER TABLE products 
ADD COLUMN cost DECIMAL(10, 2) NULL COMMENT 'Custom cost defined by Product Manager. If NULL, cost is calculated as 50% of price.';

-- Update existing products to set cost as null (will use default 50% calculation)
UPDATE products SET cost = NULL; 