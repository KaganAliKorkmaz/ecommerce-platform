const mysql = require('mysql2/promise');
const { decrypt } = require('./backend/utils/simpleEncryption');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '2001',
  database: 'online_store',
};

async function checkOrders() {
  try {
    // Create connection
    console.log('Connecting to database...');
    const connection = await mysql.createConnection(dbConfig);
    console.log('Successfully connected to database');
    
    // Test simple query
    console.log('Testing simple query...');
    const [result] = await connection.query('SELECT 1 as test');
    console.log('Simple query result:', result);
    
    // Check orders table
    console.log('Checking orders table...');
    const [orders] = await connection.query(`
      SELECT o.*, u.name AS user_name, 
             o.delivery_address
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);
    
    console.log(`Found ${orders.length} orders`);
    
    // Check each order and try to decrypt user names
    console.log('Checking orders and trying to decrypt names:');
    for (const order of orders) {
      try {
        console.log('--------------------------');
        console.log('Order ID:', order.id);
        console.log('User ID:', order.user_id);
        console.log('Status:', order.status);
        console.log('Encrypted user_name:', order.user_name);
        
        // Try to decrypt the user_name
        try {
          const decryptedName = decrypt(order.user_name);
          console.log('Decrypted user_name:', decryptedName);
        } catch (decryptError) {
          console.error('Failed to decrypt user_name:', decryptError.message);
        }
        
        // Fetch order items
        const [items] = await connection.query(
          `SELECT oi.*, p.name as product_name 
           FROM order_items oi 
           JOIN products p ON oi.product_id = p.id 
           WHERE oi.order_id = ?`,
          [order.id]
        );
        
        console.log(`Found ${items.length} items for order ${order.id}`);
      } catch (orderError) {
        console.error(`Error processing order ${order.id}:`, orderError.message);
      }
    }
    
    await connection.end();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkOrders(); 