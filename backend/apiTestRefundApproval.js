/**
 * Test script to simulate a real API call to approve a refund
 * This script directly calls the handler function in orderRoutes.js
 * 
 * Usage: node apiTestRefundApproval.js <orderId>
 */

const db = require('./config/db');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const orderRoutes = require('./routes/orderRoutes');

// Extract the handler function from orderRoutes
const manageRefundHandler = orderRoutes.stack.find(
  layer => layer.route && layer.route.path === '/:orderId/manage-refund'
)?.route?.stack?.[0]?.handle;

if (!manageRefundHandler) {
  console.error('Could not find the manage-refund route handler');
  process.exit(1);
}

async function testRefundApproval(orderId) {
  try {
    console.log(`\n===== TESTING REAL REFUND APPROVAL API FOR ORDER #${orderId} =====`);
    
    // Check if order exists and set to refund-requested if needed
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
    
    // Set status to refund-requested if it's not already
    if (order.status !== 'refund-requested') {
      console.log(`Setting order status to refund-requested for testing...`);
      await db.promise().query(
        'UPDATE orders SET status = ? WHERE id = ?',
        ['refund-requested', orderId]
      );
      console.log('Order status updated successfully');
    }
    
    // Get product information before approval
    const [productsBefore] = await db.promise().query(
      `SELECT p.id, p.name, p.stock, oi.quantity
       FROM products p
       JOIN order_items oi ON p.id = oi.product_id
       WHERE oi.order_id = ?`,
      [orderId]
    );
    
    console.log('\nProducts before refund approval:');
    console.table(productsBefore);
    
    // Create a mock request and response
    const req = {
      params: { orderId },
      body: { status: 'refund-approved', adminNote: 'Test approval via API test' },
      user: { id: 1, role: 'product_manager' }, // Mock a product manager user
      originalUrl: `/${orderId}/manage-refund`,
      method: 'PATCH',
      headers: { authorization: 'Bearer test-token' }
    };
    
    const res = {
      status: code => {
        console.log(`Response status: ${code}`);
        return res;
      },
      json: data => {
        console.log('Response data:', JSON.stringify(data, null, 2));
        return res;
      }
    };
    
    // Call the actual route handler
    console.log('\nCalling the route handler...');
    await manageRefundHandler(req, res);
    
    // Wait a moment for any async operations to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check products after approval
    const [productsAfter] = await db.promise().query(
      `SELECT p.id, p.name, p.stock, oi.quantity
       FROM products p
       JOIN order_items oi ON p.id = oi.product_id
       WHERE oi.order_id = ?`,
      [orderId]
    );
    
    console.log('\nProducts after refund approval:');
    console.table(productsAfter);
    
    // Compare stock changes
    console.log('\nStock change results:');
    for (const before of productsBefore) {
      const after = productsAfter.find(p => p.id === before.id);
      if (after) {
        const expectedChange = before.quantity;
        const actualChange = after.stock - before.stock;
        
        console.log(`- Product ${before.name} (ID: ${before.id}):`);
        console.log(`  Stock before: ${before.stock}, after: ${after.stock}`);
        console.log(`  Expected change: +${expectedChange}, Actual change: ${actualChange > 0 ? '+' : ''}${actualChange}`);
        
        if (actualChange === expectedChange) {
          console.log('  ✓ STOCK UPDATED CORRECTLY');
        } else {
          console.log('  ✗ STOCK UPDATE DISCREPANCY');
        }
      }
    }
    
    console.log('\n===== TEST COMPLETED =====');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Close the database connection
    db.end();
  }
}

// Get order ID from command line or use default
const orderId = process.argv[2];

if (!orderId) {
  console.error('Please provide an order ID');
  console.error('Usage: node apiTestRefundApproval.js <order_id>');
  process.exit(1);
}

// Run the test
testRefundApproval(orderId); 