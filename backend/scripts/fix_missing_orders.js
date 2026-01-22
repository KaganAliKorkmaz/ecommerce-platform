/**
 * This script checks for and repairs any orders that might have been 
 * corrupted during server restarts or connection issues
 */

const db = require('../config/db');

async function checkAndFixOrders() {
  console.log('Starting order verification script...');
  
  try {
    // 1. Find orders without order items
    console.log('Checking for orders without items...');
    db.query(`
      SELECT o.id, o.user_id, o.total_amount 
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE oi.id IS NULL
    `, (err, ordersWithoutItems) => {
      if (err) {
        console.error('Error checking for orders without items:', err);
        return;
      }
      
      console.log(`Found ${ordersWithoutItems.length} orders without items`);
      
      if (ordersWithoutItems.length > 0) {
        console.log('Orders without items:', ordersWithoutItems.map(o => o.id));
      }
      
      // 3. Verify order totals match sum of order items
      console.log('Verifying order totals...');
      db.query(`
        SELECT o.id, o.total_amount, 
               SUM(oi.price * oi.quantity) as calculated_total,
               o.total_amount - SUM(oi.price * oi.quantity) as difference
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        GROUP BY o.id
        HAVING ABS(difference) > 0.01
      `, (err, orderTotals) => {
        if (err) {
          console.error('Error verifying order totals:', err);
          return;
        }
        
        console.log(`Found ${orderTotals.length} orders with total amount discrepancies`);
        
        if (orderTotals.length > 0) {
          console.log('Orders with total discrepancies:', orderTotals);
        }
        
        console.log('Order verification complete!');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Error verifying orders:', error);
    process.exit(1);
  }
}

checkAndFixOrders(); 