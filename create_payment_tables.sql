-- Create payment_info table for storing encrypted payment information
CREATE TABLE IF NOT EXISTS payment_info (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    encrypted_card_number VARCHAR(255) NOT NULL,
    encrypted_card_name VARCHAR(255) NOT NULL,
    encrypted_expiration_month VARCHAR(255) NOT NULL,
    encrypted_expiration_year VARCHAR(255) NOT NULL,
    encrypted_cvv VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for better performance
CREATE INDEX idx_payment_info_order_id ON payment_info(order_id); 