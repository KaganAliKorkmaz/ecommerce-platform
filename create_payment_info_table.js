const mysql = require('mysql2');

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'online_store',
});

// Create payment_info table
async function createPaymentInfoTable() {
  try {
    console.log('Creating payment_info table...');

    // Create the payment_info table
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS payment_info (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        encrypted_card_number VARCHAR(255) NOT NULL,
        encrypted_card_name VARCHAR(255) NOT NULL,
        encrypted_expiration_month VARCHAR(255) NOT NULL,
        encrypted_expiration_year VARCHAR(255) NOT NULL,
        encrypted_cvv VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    `);
    console.log('payment_info table created successfully!');

    // Create index for faster lookups
    await db.promise().query(`
      CREATE INDEX idx_payment_order_id ON payment_info(order_id)
    `);
    console.log('Index created for payment_info table.');

    console.log('Database schema updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating payment_info table:', error);
    process.exit(1);
  }
}

// Connect to database and create table
db.connect(err => {
  if (err) {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }
  console.log('Connected to database');
  createPaymentInfoTable();
}); 