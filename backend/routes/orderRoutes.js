const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { 
  sendOrderInTransitEmail, 
  sendOrderDeliveredEmail, 
  sendOrderCancelledEmail,
  sendOrderStatusEmail 
} = require('../utils/emailService');
const { decrypt } = require('../utils/simpleEncryption');

router.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${new Date().toISOString()}] Order route: ${req.method} ${req.url}`);
  }
  next();
});

router.get('/', async (req, res) => {
  if (!req.user || !['product_manager', 'sales_manager'].includes(req.user.role)) {
    return res.status(403).json({ 
      success: false, 
      error: 'Unauthorized. Only product managers and sales managers can access this endpoint' 
    });
  }
  
  try {
    let query = `
      SELECT o.*, u.name AS user_name, 
             o.delivery_address
      FROM orders o
      JOIN users u ON o.user_id = u.id
    `;
    
    const params = [];
    
    if (req.query.status) {
      query += ' WHERE o.status = ?';
      params.push(req.query.status);
    }
    
    query += ' ORDER BY o.created_at DESC';
    
    const [orders] = await db.promise().query(query, params);
    
    if (orders.length === 0) {
      return res.json([]);
    }
    
    const ordersWithItems = [];
    
    for (const order of orders) {
      try {
        let userName = order.user_name;
        if (userName && /^[0-9a-f]{32}$/i.test(userName)) {
          try {
            userName = decrypt(userName);
          } catch (decryptError) {
            console.warn(`Failed to decrypt name for order ${order.id}, using as is: ${decryptError.message}`);
          }
        }
        
        const [items] = await db.promise().query(
          `SELECT oi.*, p.name as product_name 
           FROM order_items oi 
           JOIN products p ON oi.product_id = p.id 
           WHERE oi.order_id = ?`,
          [order.id]
        );
        
        const fullAddress = order.delivery_address || 'No address provided';
        
        ordersWithItems.push({
          ...order,
          user_name: userName,
          full_address: fullAddress,
          items: items || []
        });
      } catch (itemError) {
        console.error(`Error processing order ${order.id}:`, itemError);
        console.error('Error stack:', itemError.stack);
        
        ordersWithItems.push({
          ...order,
          items: []
        });
      }
    }
    
    res.json(ordersWithItems);
  } catch (error) {
    console.error('Error fetching all orders:', error);
    console.error('Error details:', {
      code: error.code,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch orders', 
      details: error.message 
    });
  }
});

router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    await db.promise().query('SELECT 1');

    const [users] = await db.promise().query(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      console.log('User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    const [orders] = await db.promise().query(
      `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    
    if (orders.length === 0) {
      return res.json([]);
    }
    
    const ordersWithItems = [];
    
    for (const order of orders) {
      try {
        const [items] = await db.promise().query(
          `SELECT oi.*, p.name as product_name 
           FROM order_items oi 
           JOIN products p ON oi.product_id = p.id 
           WHERE oi.order_id = ?`,
          [order.id]
        );
        
        ordersWithItems.push({
          ...order,
          items: items || []
        });
      } catch (itemError) {
        console.error(`Error fetching items for order ${order.id}:`, itemError);
        ordersWithItems.push({
          ...order,
          items: []
        });
      }
    }
    
    res.json(ordersWithItems);
  } catch (error) {
    console.error('Error fetching orders:', error);
    console.error('Error details:', {
      code: error.code,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch orders', 
      details: error.message 
    });
  }
});

router.get('/:orderId', async (req, res) => {
  const { orderId } = req.params;
  
  try {
    const [orders] = await db.promise().query(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    const order = orders[0];
    
    try {
      const [items] = await db.promise().query(
        `SELECT oi.*, p.name as product_name 
         FROM order_items oi 
         JOIN products p ON oi.product_id = p.id 
         WHERE oi.order_id = ?`,
        [orderId]
      );
      
      res.json({
        ...order,
        items: items || []
      });
    } catch (itemsError) {
      console.error('Error fetching order items:', itemsError);
      res.json({
        ...order,
        items: []
      });
    }
  } catch (error) {
    console.error('Error fetching order details:', error);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.sqlMessage) {
      console.error('SQL error:', error.sqlMessage);
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch order details',
      details: error.message
    });
  }
});

router.patch('/:orderId/status', async (req, res) => {
  const { orderId } = req.params;
  const { status, adminNote } = req.body;
  
  if (!req.user || req.user.role !== 'product_manager') {
    return res.status(403).json({ 
      success: false, 
      error: 'Unauthorized. Only product managers can update order status' 
    });
  }
  
  if (!['processing', 'in-transit', 'delivered', 'cancelled', 'refund-requested', 'refund-approved', 'refund-denied'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status value' });
  }
  
  try {
    const [orderResult] = await db.promise().query(
      'SELECT o.*, u.email, u.name FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?',
      [orderId]
    );
    
    if (orderResult.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    const order = orderResult[0];
    let userEmail;
    try {
      userEmail = decrypt(order.email);
    } catch (e) {
      console.warn(`Failed to decrypt email for order ${orderId}, using raw value: ${order.email}`);
      userEmail = order.email;
    }
    
    let userName = order.name;
    if (userName && /^[0-9a-f]{32}$/i.test(userName)) {
      try {
        userName = decrypt(userName);
      } catch (e) {
        console.warn(`Failed to decrypt name for order ${orderId}, using raw value`);
      }
    }
    
    const previousStatus = order.status;
    
    let query = '';
    const params = [];
    
    if (status === 'delivered') {
      if (adminNote) {
        query = 'UPDATE orders SET status = ?, delivered_at = NOW(), admin_note = ? WHERE id = ?';
        params.push(status, adminNote, orderId);
      } else {
        query = 'UPDATE orders SET status = ?, delivered_at = NOW() WHERE id = ?';
        params.push(status, orderId);
      }
    } else {
      if (adminNote) {
        query = 'UPDATE orders SET status = ?, admin_note = ? WHERE id = ?';
        params.push(status, adminNote, orderId);
      } else {
        query = 'UPDATE orders SET status = ? WHERE id = ?';
        params.push(status, orderId);
      }
    }
    
    const [result] = await db.promise().query(query, params);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    try {
      if (status !== previousStatus) {
        const [items] = await db.promise().query(
          `SELECT oi.*, p.name as product_name 
           FROM order_items oi 
           JOIN products p ON oi.product_id = p.id 
           WHERE oi.order_id = ?`,
          [orderId]
        );
        
        await sendOrderStatusEmail({
          to: userEmail,
          name: userName,
          orderId: order.id,
          status: status,
          orderDetails: {
            ...order,
            items: items || []
          }
        });
      }
    } catch (emailError) {
      console.error('Error sending status update email:', emailError);
    }
    
    res.json({ success: true, message: 'Order status updated', status });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
});

router.patch('/:orderId/cancel', async (req, res) => {
  const { orderId } = req.params;
  
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  try {
    await db.promise().beginTransaction();
    
    await db.promise().query('SELECT 1');
    
    const [orders] = await db.promise().query(
      'SELECT o.*, u.email, u.name FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?',
      [orderId]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }
    
    const order = orders[0];
    let userEmail;
    try {
      userEmail = decrypt(order.email);
    } catch (e) {
      console.warn(`Failed to decrypt email for order ${orderId} during cancellation, using raw value: ${order.email}`);
      userEmail = order.email;
    }
    
    let userName = order.name;
    if (userName && /^[0-9a-f]{32}$/i.test(userName)) {
      try {
        userName = decrypt(userName);
      } catch (e) {
        console.warn(`Failed to decrypt name for order ${orderId} during cancellation, using raw value`);
      }
    }
    
    const userId = String(req.user.id);
    const orderUserId = String(order.user_id);
    
    if (userId !== orderUserId) {
      return res.status(403).json({ 
        success: false, 
        error: 'You can only cancel your own orders',
        debug: {
          userId: userId,
          orderUserId: orderUserId
        }
      });
    }
    
    if (order.status !== 'processing') {
      return res.status(400).json({ 
        success: false, 
        error: 'Only orders in "processing" status can be cancelled' 
      });
    }
    
    const [updateResult] = await db.promise().query(
      'UPDATE orders SET status = ? WHERE id = ?',
      ['cancelled', orderId]
    );
    
    if (updateResult.affectedRows === 0) {
      throw new Error('Failed to update order status');
    }
    
    const [items] = await db.promise().query(
      `SELECT oi.*, p.name as product_name 
       FROM order_items oi 
       JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_id = ?`,
      [orderId]
    );
    
    try {
      await sendOrderStatusEmail({
        to: userEmail,
        name: userName,
        orderId: order.id,
        status: 'cancelled',
        orderDetails: {
          total_amount: order.total_amount,
          items: items || []
        },
        additionalInfo: req.body.cancellation_reason || 'Customer requested cancellation'
      });
    } catch (emailError) {
      console.error('Error sending cancellation email:', emailError);
    }
    
    await db.promise().commit();
    
    try {
      await db.promise().beginTransaction();
      
      const [orderItems] = await db.promise().query(
        `SELECT oi.*, p.name, p.stock
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [orderId]
      );
      
      let allUpdatesSuccessful = true;
      
      for (const item of orderItems) {
        const [currentProductData] = await db.promise().query(
          'SELECT id, stock FROM products WHERE id = ? FOR UPDATE',
          [item.product_id]
        );
        
        if (currentProductData.length === 0) {
          console.error(`Product ${item.product_id} not found!`);
          allUpdatesSuccessful = false;
          continue;
        }
        
        const updateQuery = 'UPDATE products SET stock = stock + ? WHERE id = ?';
        const [updateResult] = await db.promise().query(updateQuery, [item.quantity, item.product_id]);
        
        const updateSuccess = updateResult.affectedRows > 0;
        
        if (!updateSuccess) {
          allUpdatesSuccessful = false;
        }
        
        const [updatedProduct] = await db.promise().query(
          'SELECT id, name, stock FROM products WHERE id = ?',
          [item.product_id]
        );
      }
      
      if (allUpdatesSuccessful) {
        await db.promise().commit();
      } else {
        await db.promise().rollback();
        console.error(`CRITICAL: Failed to update stock for cancelled order #${orderId}. Manual intervention required.`);
      }
    } catch (stockError) {
      console.error('Error restoring product stock after cancellation:', stockError);
      
      try {
        await db.promise().rollback();
      } catch (rollbackError) {
        console.error('Error rolling back stock update transaction:', rollbackError);
      }
      
      console.error(`CRITICAL ERROR: Failed to update stock for cancelled order #${orderId}. Manual intervention required.`);
    }
    
    res.json({ 
      success: true, 
      message: 'Order cancelled successfully' 
    });
    
  } catch (error) {
    await db.promise().rollback();
    if (error.code === 'PROTOCOL_CONNECTION_LOST') {
      // Handle database connection issues
      return res.status(500).json({
        success: false,
        error: 'Database connection error',
        details: error.message
      });
    }
    console.error('=== Detailed Error Log ===');
    console.error('Request body:', req.body);
    console.error('Request user:', req.user);
    console.error('Database connection status:', db.state);
    console.error('Error:', error);
    console.error('=== Error Details ===');
    console.error('Error cancelling order:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('===========');
    
    return res.status(500).json({
      success: false,
      error: 'An error occurred while cancelling the order',
      details: error.message
    });
  }
});

router.post('/:orderId/refund-request', async (req, res) => {
  const { orderId } = req.params;
  const { reason } = req.body;
  const userId = req.user.id;
  
  try {
    const [orders] = await db.promise().query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found or does not belong to you'
      });
    }
    
    const order = orders[0];
    
    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        error: 'Only delivered orders can be refunded'
      });
    }
    
    const [result] = await db.promise().query(
      `INSERT INTO refund_requests 
       (order_id, user_id, reason, status, requested_at) 
       VALUES (?, ?, ?, 'pending', NOW())`,
      [orderId, userId, reason || 'No reason provided']
    );
    
    if (result.affectedRows === 0) {
      throw new Error('Failed to create refund request');
    }
    
    await db.promise().query(
      'UPDATE orders SET status = ? WHERE id = ?',
      ['refund-requested', orderId]
    );
    
    const [users] = await db.promise().query(
      'SELECT email, name FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length > 0) {
      const user = users[0];
      
      let userEmail;
      try {
        userEmail = decrypt(user.email);
      } catch (e) {
        console.warn(`Failed to decrypt email for user ${userId} during refund request, using raw value: ${user.email}`);
        userEmail = user.email;
      }
      
      let userName = user.name;
      if (userName && /^[0-9a-f]{32}$/i.test(userName)) {
        try {
          userName = decrypt(userName);
        } catch (e) {
          console.warn(`Failed to decrypt name for user ${userId} during refund request, using raw value`);
        }
      }
      
      const [items] = await db.promise().query(
        `SELECT oi.*, p.name as product_name 
         FROM order_items oi 
         JOIN products p ON oi.product_id = p.id 
         WHERE oi.order_id = ?`,
        [orderId]
      );
      
      try {
        await sendOrderStatusEmail({
          to: userEmail,
          name: userName,
          orderId: order.id,
          status: 'refund-requested',
          orderDetails: {
            total_amount: order.total_amount,
            items: items || []
          },
          additionalInfo: reason || 'No reason provided'
        });
      } catch (emailError) {
        console.error('Failed to send refund request email:', emailError);
      }
    }
    
    res.json({
      success: true,
      message: 'Refund request submitted successfully',
      refundId: result.insertId
    });
  } catch (error) {
    console.error('Error processing refund request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process refund request',
      details: error.message
    });
  }
});

module.exports = router; 