-- Önce kategorileri ekleyelim
INSERT INTO categories (name, description) VALUES
('Computers', 'Desktop and laptop computers'),
('Phones', 'Smartphones and mobile devices'),
('TV & Display', 'Television sets and monitors'),
('Audio', 'Audio equipment and accessories'),
('Gaming', 'Gaming consoles and accessories'),
('Accessories', 'Various tech accessories'),
('Wearable Technology', 'Smart watches and fitness trackers');

-- Şimdi ürünleri ekleyelim (visible=1 olarak)
INSERT INTO products (name, model, description, stock, price, warranty_months, category_id, visible) VALUES
('MacBook Pro M2', 'MBP2023', 'Latest MacBook Pro with M2 chip', 10, 1299.99, 24, 1, 1),
('iPhone 15 Pro', 'IP15PRO', 'Latest iPhone with advanced camera system', 20, 999.99, 12, 2, 1),
('Samsung QLED TV', 'QN65Q80C', '65-inch QLED 4K Smart TV', 5, 1499.99, 24, 3, 1),
('Sony WH-1000XM4', 'WH1000XM4', 'Wireless Noise Cancelling Headphones', 15, 349.99, 12, 4, 1),
('PlayStation 5', 'PS5-2023', 'Sony PlayStation 5 Gaming Console', 8, 499.99, 12, 5, 1),
('Dell XPS 13', 'XPS13-2023', 'Premium ultrabook with InfinityEdge display', 12, 1199.99, 24, 1, 1),
('Samsung Galaxy S23', 'S23-Ultra', 'Premium Android smartphone', 25, 899.99, 12, 2, 1),
('LG OLED TV', 'OLED65C3', '65-inch OLED 4K Smart TV', 7, 1799.99, 24, 3, 1),
('Apple AirPods Pro', 'APP2', 'Wireless earbuds with noise cancellation', 30, 249.99, 12, 4, 1),
('Xbox Series X', 'XSX-2023', 'Microsoft Xbox Series X Gaming Console', 10, 499.99, 12, 5, 1),
('Apple Watch Series 8', 'AWS8', 'Latest Apple Watch with health features', 15, 399.99, 12, 7, 1),
('Samsung Galaxy Watch 6', 'GW6', 'Advanced Android smartwatch', 18, 299.99, 12, 7, 1); 