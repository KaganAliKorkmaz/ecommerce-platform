-- Add popularity column to products table
ALTER TABLE products ADD COLUMN popularity INT DEFAULT 0;

-- Create a trigger to update popularity when a product is ordered
DELIMITER //
CREATE TRIGGER update_product_popularity
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
    UPDATE products 
    SET popularity = popularity + NEW.quantity 
    WHERE id = NEW.product_id;
END //
DELIMITER ;

-- Calculate initial popularity values based on existing order data
UPDATE products p
SET popularity = (
    SELECT COALESCE(SUM(oi.quantity), 0)
    FROM order_items oi
    WHERE oi.product_id = p.id
);

-- Add an index on the popularity column for better query performance
ALTER TABLE products ADD INDEX idx_product_popularity (popularity); 