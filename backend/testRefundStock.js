/**
 * Test script for verifying that stock updates work properly for refunds
 * Run with: node testRefundStock.js <order_id>
 */

const db = require('./config/db');

async function testRefundStockUpdate(orderId) {
  try {
    console.log(`\n======= TESTING STOCK UPDATE FOR ORDER #${orderId} =======`);
    
    // Check if order exists
    const [orders] = await db.promise().query(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );
    
    if (orders.length === 0) {
      console.error(`Order #${orderId} not found!`);
      process.exit(1);
    }
    
    const order = orders[0];
    console.log(`Found order #${orderId} with status: ${order.status}`);
    
    // Check order items
    const [orderItems] = await db.promise().query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [orderId]
    );
    
    if (orderItems.length === 0) {
      console.error(`No order items found for order #${orderId}!`);
      process.exit(1);
    }
    
    console.log(`Found ${orderItems.length} order items`);
    
    // Get products and stock before update
    const [productsBeforeUpdate] = await db.promise().query(`
      SELECT p.id, p.name, p.stock, oi.quantity 
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      WHERE oi.order_id = ?
    `, [orderId]);
    
    console.log('\nProducts and stock BEFORE update:');
    console.table(productsBeforeUpdate);
    
    // Start a transaction
    await db.promise().beginTransaction();
    console.log('\nStarted database transaction');
    
    try {
      // Test the stock update query
      const stockUpdateQuery = `
        UPDATE products p
        JOIN order_items oi ON p.id = oi.product_id
        SET p.stock = p.stock + oi.quantity
        WHERE oi.order_id = ?
      `;
      
      console.log('\nExecuting stock update query:', stockUpdateQuery);
      console.log('Order ID:', orderId);
      
      const [stockUpdateResult] = await db.promise().query(stockUpdateQuery, [orderId]);
      
      console.log('\nStock update result:', stockUpdateResult);
      
      // Verify the update worked
      const [productsAfterUpdate] = await db.promise().query(`
        SELECT p.id, p.name, p.stock, oi.quantity 
        FROM products p
        JOIN order_items oi ON p.id = oi.product_id
        WHERE oi.order_id = ?
      `, [orderId]);
      
      console.log('\nProducts and stock AFTER update:');
      console.table(productsAfterUpdate);
      
      // Compare before and after for each product
      console.log('\nStock change details:');
      productsBeforeUpdate.forEach(beforeProduct => {
        const afterProduct = productsAfterUpdate.find(p => p.id === beforeProduct.id);
        if (afterProduct) {
          console.log(`Product ${beforeProduct.name}: Stock changed from ${beforeProduct.stock} to ${afterProduct.stock} (Expected change: +${beforeProduct.quantity})`);
          
          // Check if the change matches the expected quantity
          const actualChange = afterProduct.stock - beforeProduct.stock;
          if (actualChange !== beforeProduct.quantity) {
            console.warn(`WARNING: Stock change (${actualChange}) doesn't match expected quantity (${beforeProduct.quantity})`);
          }
        }
      });
      
      console.log('\nCommitting transaction...');
      await db.promise().commit();
      console.log('Transaction committed successfully!');
      
    } catch (error) {
      console.error('\nError during test:', error);
      console.log('Rolling back transaction...');
      await db.promise().rollback();
      console.log('Transaction rolled back');
    }
    
    console.log('\n======= TEST COMPLETED =======');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Close the database connection
    db.end();
  }
}

// Get order ID from command line arguments
const orderId = process.argv[2] || 1;

// Run the test
testRefundStockUpdate(orderId); 