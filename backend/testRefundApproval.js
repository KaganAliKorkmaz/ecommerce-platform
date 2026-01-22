/**
 * Test script for the refund approval process
 * This script will simulate approving a refund and check if stock is updated
 * Run with: node testRefundApproval.js <order_id>
 */

const db = require('./config/db');

async function testRefundApproval(orderId) {
  try {
    console.log(`\n======= TESTING REFUND APPROVAL FOR ORDER #${orderId} =======`);
    
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
    
    // Make sure the order is in refund-requested status
    if (order.status !== 'refund-requested') {
      console.log(`Order #${orderId} is not in refund-requested status (current: ${order.status})`);
      
      // Set order to refund-requested for testing
      console.log('Setting order to refund-requested status for testing...');
      await db.promise().query(
        'UPDATE orders SET status = ? WHERE id = ?',
        ['refund-requested', orderId]
      );
      console.log('Order status updated for testing');
    }
    
    // Get products and stock before update
    const [productsBeforeUpdate] = await db.promise().query(`
      SELECT p.id, p.name, p.stock, oi.quantity 
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      WHERE oi.order_id = ?
    `, [orderId]);
    
    if (productsBeforeUpdate.length === 0) {
      console.error(`No products found for order #${orderId}!`);
      process.exit(1);
    }
    
    console.log('\nProducts and stock BEFORE update:');
    console.table(productsBeforeUpdate);
    
    // Start a transaction
    await db.promise().beginTransaction();
    console.log('\nStarted database transaction');
    
    try {
      // Update order status to refund-approved
      console.log('\nUpdating order status to refund-approved...');
      await db.promise().query(
        'UPDATE orders SET status = ?, admin_note = ? WHERE id = ?',
        ['refund-approved', 'Test refund approval from script', orderId]
      );
      console.log('Order status updated to refund-approved');
      
      // Update refund request if it exists
      const [refundRequests] = await db.promise().query(
        'SELECT * FROM refund_requests WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
        [orderId]
      );
      
      if (refundRequests.length > 0) {
        console.log('\nUpdating refund request status...');
        await db.promise().query(
          'UPDATE refund_requests SET status = ?, approved_at = ? WHERE id = ?',
          ['approved', new Date(), refundRequests[0].id]
        );
        console.log('Refund request updated');
      } else {
        console.log('\nNo refund request found, skipping update');
      }
      
      // Perform stock update
      const stockUpdateQuery = `
        UPDATE products p
        JOIN order_items oi ON p.id = oi.product_id
        SET p.stock = p.stock + oi.quantity
        WHERE oi.order_id = ?
      `;
      
      console.log('\nExecuting stock update query:', stockUpdateQuery);
      console.log('Order ID:', orderId);
      
      const [stockUpdateResult] = await db.promise().query(stockUpdateQuery, [orderId]);
      
      console.log('\nStock update result:', JSON.stringify(stockUpdateResult, null, 2));
      
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
testRefundApproval(orderId); 