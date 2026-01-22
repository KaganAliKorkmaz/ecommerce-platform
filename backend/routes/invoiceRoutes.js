const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { getOrGenerateInvoice } = require('../utils/invoiceGenerator');
const path = require('path');
const fs = require('fs-extra');
const { decrypt } = require('../utils/simpleEncryption');

console.log('*** invoiceRoutes.js file loaded ***');

// Sales Manager: Get all invoices with optional date range filter
router.get('/manager/all', async (req, res) => {
  console.log('Fetching all invoices for sales manager');
  console.log('Request query:', req.query);
  console.log('Auth user from token:', req.user);
  
  // Check if user is sales manager
  if (!req.user || req.user.role !== 'sales_manager') {
    return res.status(403).json({ 
      success: false, 
      error: 'Unauthorized. Only sales managers can access this endpoint' 
    });
  }
  
  try {
    const { startDate, endDate } = req.query;
    
    let query = `
      SELECT o.id, o.user_id, o.total_amount, o.status, 
             o.delivery_address, o.created_at,
             u.name AS user_name, u.email AS user_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
    `;
    
    const params = [];
    
    // Add date range filter if provided
    if (startDate && endDate) {
      query += ' WHERE o.created_at BETWEEN ? AND ?';
      params.push(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      query += ' WHERE o.created_at >= ?';
      params.push(new Date(startDate));
    } else if (endDate) {
      query += ' WHERE o.created_at <= ?';
      params.push(new Date(endDate));
    }
    
    // Add order by
    query += ' ORDER BY o.created_at DESC';
    
    const [orders] = await db.promise().query(query, params);
    
    console.log(`Found ${orders.length} orders`);
    
    // If no orders found, return empty array
    if (orders.length === 0) {
      return res.json([]);
    }
    
    // Decrypt user names and process orders
    const processedOrders = [];
    
    for (const order of orders) {
      try {
        // Try to decrypt fields - might not be encrypted in all systems
        try {
          order.user_name = decrypt(order.user_name);
          order.user_email = decrypt(order.user_email);
        } catch (decryptError) {
          console.log('Fields might not be encrypted or decryption failed:', decryptError);
        }
        
        processedOrders.push({
          id: order.id,
          user_id: order.user_id,
          user_name: order.user_name,
          user_email: order.user_email,
          total_amount: order.total_amount,
          status: order.status,
          created_at: order.created_at,
          invoiceUrl: `/api/invoices/${order.id}`
        });
      } catch (error) {
        console.error(`Error processing order ${order.id}:`, error);
      }
    }
    
    res.json(processedOrders);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch invoices', 
      details: error.message 
    });
  }
});

// Generate or retrieve an invoice for a specific order
router.get('/:orderId', async (req, res) => {
  const { orderId } = req.params;
  
  // Restore original user ID extraction
  let userId;
  if (req.user && req.user.id) { // Check for req.user and req.user.id
    userId = req.user.id;
  } else {
    // Log details if user ID is missing
    console.error('Authentication error: User ID missing from request token.', { user: req.user });
    return res.status(401).json({
      success: false,
      error: 'Authentication required - user ID not found in token'
    });
  }
  
  try {
    // Check if user is a sales manager
    const isSalesManager = req.user.role === 'sales_manager';
    
    // Check if order exists and belongs to the user (unless the user is a sales manager)
    let query, params;
    if (isSalesManager) {
      query = 'SELECT * FROM orders WHERE id = ?';
      params = [orderId];
    } else {
      query = 'SELECT * FROM orders WHERE id = ? AND user_id = ?';
      params = [orderId, userId];
    }
    
    const [orders] = await db.promise().query(query, params);
        
    if (orders.length === 0) {
      console.log(`Order not found or permission denied: orderId=${orderId}, userId=${userId}`);
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found or does not belong to this user' 
      });
    }
    
    const order = orders[0];
    
    // Get order items
    const [items] = await db.promise().query(
      `SELECT oi.*, p.name as product_name 
       FROM order_items oi 
       JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_id = ?`,
      [orderId]
    );
    
    order.items = items || [];
    
    // Get user information (needed for the invoice content)
    const [users] = await db.promise().query(
      'SELECT id, name, email, address, tax_id FROM users WHERE id = ?',
      [order.user_id] 
    );
    
    if (users.length === 0) {
       // This case should be rare if the order query succeeded, but good to check
      console.error(`User not found for invoice generation: userId=${order.user_id}`);
      return res.status(404).json({ 
        success: false, 
        error: 'User associated with the order not found' 
      });
    }
    
    const user = users[0];
    
    // If user fields are encrypted, decrypt them
    try {
      user.name = decrypt(user.name);
      user.email = decrypt(user.email);
      user.address = decrypt(user.address);
      // Decrypt tax_id if it exists
      if (user.tax_id) {
        user.tax_id = decrypt(user.tax_id);
        console.log('Decrypted tax_id:', user.tax_id);
      } else {
        console.log('No tax_id found for user:', user.id);
      }
    } catch (decryptError) {
      console.log('Fields might not be encrypted or decryption failed:', decryptError);
    }
    
    // Generate or retrieve invoice
    const invoicePath = await getOrGenerateInvoice(order, user);
        
    // Try to verify the file exists before sending
    if (!fs.existsSync(invoicePath)) {
      console.error('Error: Generated invoice file does not exist after generation attempt:', invoicePath);
      return res.status(500).json({
        success: false,
        error: 'Generated invoice file could not be located'
      });
    }
        
    // Set proper content type for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-order-${orderId}.pdf"`);
        
    // Send the invoice
    fs.createReadStream(invoicePath).pipe(res);

  } catch (error) {
    console.error(`Error generating invoice for order ${orderId}, user ${userId}:`, error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate invoice due to a server error',
      details: error.message // Avoid sending detailed stack in production
    });
  }
});

module.exports = router; 