/**
 * Emergency fix script to update stock for a refunded order
 * This bypasses the normal logic to directly update the stock
 * Run with: node fixRefundStock.js <order_id>
 */

const db = require('./config/db');

async function fixRefundStock(orderId) {
  try {
    console.log(`\n===== EMERGENCY FIX FOR ORDER #${orderId} STOCK =====`);
    
    // First, verify the order exists
    const [orders] = await db.promise().query(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );
    
    if (orders.length === 0) {
      console.error(`Order #${orderId} not found!`);
      process.exit(1);
    }
    
    const order = orders[0];
    console.log(`Found order: #${orderId}, status: ${order.status}`);
    
    // Check if the order is already refunded or approved
    if (!['refund-approved', 'refunded'].includes(order.status)) {
      console.log(`Order #${orderId} is not refunded yet (current status: ${order.status})`);
      console.log('Setting status to refund-approved for testing...');
      
      // Update the order status
      await db.promise().query(
        'UPDATE orders SET status = ? WHERE id = ?',
        ['refund-approved', orderId]
      );
      console.log('Order status updated to refund-approved');
    }
    
    // Get all items in the order
    console.log('Getting order items...');
    const [items] = await db.promise().query(
      `SELECT oi.*, p.name as product_name, p.stock 
       FROM order_items oi 
       JOIN products p ON oi.product_id = p.id 
       WHERE order_id = ?`,
      [orderId]
    );
    
    if (items.length === 0) {
      console.error('No items found for this order!');
      process.exit(1);
    }
    
    console.log(`Found ${items.length} items in the order`);
    console.log('\nItems:', items.map(item => `${item.product_name}: Quantity=${item.quantity}, Current stock=${item.stock}`).join('\n'));
    
    // Update stock for each product one by one
    for (const item of items) {
      const productId = item.product_id;
      const quantity = item.quantity;
      
      console.log(`\n>> Processing item: ${item.product_name} (ID: ${productId})`);
      console.log(`Current stock: ${item.stock}`);
      console.log(`Will add quantity: ${quantity}`);
      
      // First verify current stock
      const [currentStock] = await db.promise().query(
        'SELECT stock FROM products WHERE id = ?',
        [productId]
      );
      
      console.log(`Confirmed current stock from DB: ${currentStock[0].stock}`);
      
      // Update stock with direct query
      console.log('Updating stock with direct query...');
      try {
        const [updateResult] = await db.promise().query(
          'UPDATE products SET stock = stock + ? WHERE id = ?',
          [quantity, productId]
        );
        
        console.log('Update result:', JSON.stringify(updateResult));
        
        if (updateResult.affectedRows > 0) {
          // Verify the new stock
          const [newStock] = await db.promise().query(
            'SELECT stock FROM products WHERE id = ?',
            [productId]
          );
          
          console.log(`New stock: ${newStock[0].stock}`);
          console.log(`Stock change: +${newStock[0].stock - currentStock[0].stock}`);
          
          if (newStock[0].stock > currentStock[0].stock) {
            console.log('✅ STOCK INCREASED SUCCESSFULLY');
          } else {
            console.log('❌ STOCK DID NOT INCREASE!');
          }
        } else {
          console.log('❌ NO ROWS AFFECTED BY UPDATE!');
        }
      } catch (error) {
        console.error('ERROR UPDATING STOCK:', error);
      }
    }
    
    console.log('\n===== FIX COMPLETED =====');
    console.log('Please verify that stock has been updated correctly');
    
  } catch (error) {
    console.error('Error in fix script:', error);
  } finally {
    db.end();
  }
}

// Get order ID from command line or use default
const orderId = process.argv[2];

if (!orderId) {
  console.error('Please provide an order ID');
  console.error('Usage: node fixRefundStock.js <order_id>');
  process.exit(1);
}

// Run the fix
fixRefundStock(orderId); 