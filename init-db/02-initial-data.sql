USE online_store;

-- Insert sample categories
INSERT INTO categories (name, description) VALUES 
('Computers', 'Desktop and laptop computers'),
('Phones', 'Smartphones and mobile devices'),
('TV & Display', 'Televisions and monitors'),
('Audio', 'Speakers, headphones, and audio equipment'),
('Gaming', 'Gaming consoles and accessories'),
('Accessories', 'Various tech accessories'),
('Wearable Technology', 'Smartwatches and fitness trackers');

-- Insert sample products
INSERT INTO products (name, model, description, stock, price, cost, warranty_months, category_id, visible, price_approved, popularity) VALUES
('MacBook Pro 16"', 'M3 Pro', 'Apple MacBook Pro 16-inch with M3 Pro chip', 10, 2999.99, 2500.00, 12, 1, TRUE, TRUE, 100),
('iPhone 15 Pro', 'A17 Pro', 'Apple iPhone 15 Pro with A17 Pro chip', 20, 999.99, 800.00, 12, 2, TRUE, TRUE, 150),
('Samsung Galaxy S24 Ultra', 'SM-S928', 'Samsung Galaxy S24 Ultra with Snapdragon processor', 15, 1299.99, 1000.00, 12, 2, TRUE, TRUE, 120),
('Dell XPS 15', '9530', 'Dell XPS 15 laptop with Intel Core i7', 8, 1699.99, 1400.00, 24, 1, TRUE, TRUE, 80),
('Sony WH-1000XM5', 'WH-1000XM5', 'Sony noise-cancelling headphones', 30, 349.99, 250.00, 12, 4, TRUE, TRUE, 90),
('Samsung QLED TV', 'QN90C', 'Samsung 65-inch QLED 4K Smart TV', 5, 1499.99, 1200.00, 24, 3, TRUE, TRUE, 70),
('PlayStation 5', 'CFI-1215A', 'Sony PlayStation 5 Digital Edition', 12, 499.99, 400.00, 12, 5, TRUE, TRUE, 110);

-- Insert admin and manager users 
-- Note: In a real application, you would use bcrypt to hash these passwords
-- These are just for demo purposes with a placeholder hash
INSERT INTO users (name, email, password, address, role) VALUES
('Admin User', 'product@example.com', '$2a$10$xZtcDZ1bxEVtUaMEgPeHIeZJ/D4OOSUk3JkzasRLTkwEkpZ8eR4TK', 'Admin Office Address', 'product_manager'),
('Sales Manager', 'sale@example.com', '$2a$10$3/o/FrWVRPuUZ6OWduwYO.yxjsEjFAU4IU1OwHjyrbIhQZmfuPK9q', 'Sales Office Address', 'sales_manager'); 