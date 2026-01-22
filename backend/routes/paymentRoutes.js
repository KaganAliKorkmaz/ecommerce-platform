const express = require('express');
const router = express.Router();
const db = require('../config/db');
const mysql = require('mysql2/promise'); // Import promise-based mysql
const { getOrGenerateInvoice } = require('../utils/invoiceGenerator');
const { sendInvoiceEmail } = require('../utils/emailService');
const { encrypt, decrypt } = require('../utils/simpleEncryption');

router.post('/process', async (req, res) => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });

    const { 
      cardNumber, 
      cardName, 
      expirationMonth, 
      expirationYear, 
      cvv, 
      userId, 
      items, 
      totalAmount, 
      checkoutEmail,
      shippingAddress 
    } = req.body;

    if (!cardNumber || !cardName || !expirationMonth || !expirationYear || !cvv) {
      return res.status(400).json({ success: false, error: 'Missing payment information' });
    }

    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    if (cleanCardNumber.length !== 16) {
      return res.status(400).json({ success: false, error: 'Card number must be 16 digits' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'No items in order' });
    }

    const [userResult] = await connection.query(
      'SELECT id, name, email, address, tax_id FROM users WHERE id = ?',
      [userId]
    );

    if (!userResult || userResult.length === 0) {
      await connection.end();
      return res.status(400).json({ success: false, error: 'User not found' });
    }
    
    const user = userResult[0];
    
    let decryptedUserName;
    try {
      decryptedUserName = decrypt(user.name);
    } catch (e) {
      console.error('Error decrypting user name:', e);
      decryptedUserName = 'User';
    }
    
    let decryptedUserEmail;
    try {
      decryptedUserEmail = decrypt(user.email);
    } catch (e) {
      console.error('Error decrypting user email:', e);
      return res.status(500).json({ success: false, error: 'Failed to process user data' });
    }
    
    let decryptedUserAddress;
    try {
      decryptedUserAddress = decrypt(user.address);
    } catch (e) {
      console.error('Error decrypting user address:', e);
      decryptedUserAddress = '';
    }
    
    let decryptedTaxId = null;
    if (user.tax_id) {
      try {
        decryptedTaxId = decrypt(user.tax_id);
      } catch (e) {
        console.error('Error decrypting tax_id:', e);
        decryptedTaxId = null;
      }
    }
    
    const invoiceEmail = checkoutEmail || decryptedUserEmail;
    const deliveryAddress = shippingAddress || decryptedUserAddress;

    await connection.beginTransaction();
    
    let orderId = null;
    
    try {
      const [orderResult] = await connection.query(
        'INSERT INTO orders (user_id, total_amount, status, delivery_address) VALUES (?, ?, ?, ?)',
        [userId, totalAmount, 'processing', deliveryAddress]
      );
      orderId = orderResult.insertId;

      for (const item of items) {
        const [stockResult] = await connection.query(
          'SELECT stock FROM products WHERE id = ?',
          [item.productId]
        );

        if (!stockResult[0]) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        if (stockResult[0].stock < item.quantity) {
          throw new Error(`Insufficient stock for product ID ${item.productId}`);
        }

        await connection.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
          [orderId, item.productId, item.quantity, item.price]
        );

        await connection.query(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.productId]
        );
      }

      const encryptedCardNumber = encrypt(cleanCardNumber);
      const encryptedCardName = encrypt(cardName);
      const encryptedExpirationMonth = encrypt(expirationMonth);
      const encryptedExpirationYear = encrypt(expirationYear);
      const encryptedCVV = encrypt(cvv);

      await connection.query(
        `INSERT INTO payment_info 
        (order_id, encrypted_card_number, encrypted_card_name, encrypted_expiration_month, encrypted_expiration_year, encrypted_cvv) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, encryptedCardNumber, encryptedCardName, encryptedExpirationMonth, encryptedExpirationYear, encryptedCVV]
      );
      
      await connection.commit();
      
      const [orderDetails] = await connection.query(
        'SELECT * FROM orders WHERE id = ?',
        [orderId]
      );
      
      if (!orderDetails || orderDetails.length === 0) {
        throw new Error('Failed to retrieve order details');
      }
      
      const order = orderDetails[0];
      
      const [orderItems] = await connection.query(
        `SELECT oi.*, p.name as product_name 
         FROM order_items oi 
         JOIN products p ON oi.product_id = p.id 
         WHERE oi.order_id = ?`,
        [orderId]
      );
      
      order.items = orderItems || [];
      
      try {
        const invoiceUser = {
          id: user.id,
          name: decryptedUserName,
          email: invoiceEmail,
          tax_id: decryptedTaxId
        };
        
        order.delivery_address = deliveryAddress;
        
        const invoicePath = await getOrGenerateInvoice(order, invoiceUser);
        
        const emailResult = await sendInvoiceEmail({
          to: invoiceEmail,
          subject: `Your Invoice for Order #${orderId}`,
          text: `Dear ${decryptedUserName},\n\nThank you for your purchase. Your order #${orderId} has been processed successfully. Please find your invoice attached.\n\nRegards,\nTechStore Team`,
          html: `<!DOCTYPE html>
                <html>
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Order Confirmation</title>
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background-color: #f9f9f9; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>Thank You For Your Order!</h1>
                    </div>
                    <div class="content">
                      <p>Dear ${decryptedUserName},</p>
                      <p>Your order #${orderId} has been processed successfully.</p>
                      <p>Please find your invoice attached to this email.</p>
                      <p>If you have any questions, please contact our customer service.</p>
                      <p><strong>Order Details:</strong></p>
                      <p>Order ID: ${orderId}<br>
                      Total Amount: $${parseFloat(totalAmount).toFixed(2)}<br>
                      Status: Processing</p>
                    </div>
                    <div class="footer">
                      <p>Regards,<br>TechStore Team</p>
                      <p>© 2025 TechStore. All rights reserved.</p>
                    </div>
                  </div>
                </body>
                </html>`,
          invoicePath: invoicePath
        });
      } catch (emailError) {
        console.error('Error sending invoice email:', emailError.message);
      }
    } catch (error) {
      console.error('Error during payment processing:', error);
      await connection.rollback();
      await connection.end();
      
      return res.status(400).json({ 
        success: false, 
        error: error.message || 'Failed to process payment'
      });
    } finally {
      await connection.end();
    }
    
    res.json({ 
      success: true, 
      orderId: orderId,
      message: 'Order placed successfully'
    });

  } catch (error) {
    console.error('Payment Error:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message || 'Failed to process payment'
    });
  }
});

module.exports = router; 