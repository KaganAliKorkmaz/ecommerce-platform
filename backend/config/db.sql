-- Payment Info table for storing encrypted payment data
CREATE TABLE IF NOT EXISTS payment_info (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  encrypted_card_number TEXT NOT NULL,
  encrypted_card_name TEXT NOT NULL,
  encrypted_cvv TEXT NOT NULL,
  expiration_month VARCHAR(2) NOT NULL,
  expiration_year VARCHAR(4) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
); 