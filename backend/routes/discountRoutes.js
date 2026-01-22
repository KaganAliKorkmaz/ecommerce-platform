const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/auth');

// All discount routes require authentication
router.use(verifyToken);

// Get all discounts
router.get('/', async (req, res) => {
  if (!req.user || req.user.role !== 'sales_manager') {
    return res.status(403).json({ error: 'Only sales managers can view discounts' });
  }

  try {
    const [discounts] = await db.promise().query(`
      SELECT d.*, p.name as product_name, p.price as original_price
      FROM discounts d
      JOIN products p ON d.product_id = p.id
      ORDER BY d.created_at DESC
    `);
    res.json(discounts);
  } catch (error) {
    console.error('Error fetching discounts:', error);
    res.status(500).json({ error: 'Failed to fetch discounts' });
  }
});

// Create new discount
router.post('/', async (req, res) => {
  if (!req.user || req.user.role !== 'sales_manager') {
    return res.status(403).json({ error: 'Only sales managers can create discounts' });
  }

  const { product_id, discount_type, discount_value, start_date, end_date } = req.body;

  try {
    // Check if product exists
    const [products] = await db.promise().query('SELECT * FROM products WHERE id = ?', [product_id]);
    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if there's already an active discount for this product
    const [existingDiscounts] = await db.promise().query(`
      SELECT * FROM discounts 
      WHERE product_id = ? 
      AND (
        (start_date <= ? AND end_date >= ?) OR
        (start_date <= ? AND end_date >= ?)
      )
    `, [product_id, start_date, start_date, end_date, end_date]);

    if (existingDiscounts.length > 0) {
      return res.status(400).json({ error: 'There is already a discount for this product in the specified date range' });
    }

    const [result] = await db.promise().query(
      `INSERT INTO discounts (product_id, discount_type, discount_value, start_date, end_date, is_active) 
       VALUES (?, ?, ?, ?, ?, true)`,
      [product_id, discount_type, discount_value, start_date, end_date]
    );

    const [newDiscount] = await db.promise().query(`
      SELECT d.*, p.name as product_name, p.price as original_price
      FROM discounts d
      JOIN products p ON d.product_id = p.id
      WHERE d.id = ?
    `, [result.insertId]);

    res.status(201).json(newDiscount[0]);

    // --- Start: Notify wishlisted users about discount ---
    if (newDiscount.length > 0) {
      const { product_id, discount_type, discount_value, product_name } = newDiscount[0];

      try {
        // Find users who have wishlisted this product
        const [wishlistedUsers] = await db.promise().query(
          `SELECT u.id, u.name, u.email
           FROM wishlist w
           JOIN users u ON w.user_id = u.id
           WHERE w.product_id = ?`,
          [product_id]
        );

        console.log(`Found ${wishlistedUsers.length} users who wishlisted product ${product_id}. Notifying them about the discount.`);

        // Send notification and create database entry for each wishlisted user
        for (const user of wishlistedUsers) {
          try {
            const notificationMessage = `The product you wishlisted, ${product_name}, is now on sale!`;
            const notificationMetadata = JSON.stringify({
              product_id: product_id,
              discount_type: discount_type,
              discount_value: discount_value,
              product_name: product_name,
              // Add other relevant info as needed
            });

            // Insert notification into the database
            await db.promise().query(
              `INSERT INTO notifications (user_id, type, message, metadata)
               VALUES (?, ?, ?, ?)`,
              [user.id, 'discount', notificationMessage, notificationMetadata]
            );
            console.log(`Created discount notification for user ID ${user.id} for product ${product_name}`);

            // Safely decrypt email before sending (optional, as notification is in DB now)
            const recipientEmail = safelyDecryptEmail(user.email);
            if (recipientEmail) {
              // Email notification can still be sent in addition to DB notification
              // await sendDiscountNotification(recipientEmail, user.name, product_name, discount_type, discount_value);
              // console.log(`Sent discount email notification to ${recipientEmail}`);
            } else {
              console.warn(`Skipping email notification for user ${user.name}: Invalid or missing email`);
            }

          } catch (userNotificationError) {
            console.error(`Error creating notification or sending email for user ${user.name} (ID: ${user.id}) for product ${product_name}:`, userNotificationError);
            // Continue to the next user even if one fails
          }
        }
      } catch (wishlistError) {
        console.error('Error fetching wishlisted users or creating notifications:', wishlistError);
        // Do not block discount creation if fetching users or creating notifications fails
      }
    }
    // --- End: Notify wishlisted users about discount ---

  } catch (error) {
    console.error('Error creating discount:', error);
    res.status(500).json({ error: 'Failed to create discount' });
  }
});

// Delete discount
router.delete('/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'sales_manager') {
    return res.status(403).json({ error: 'Only sales managers can delete discounts' });
  }

  const { id } = req.params;

  try {
    await db.promise().query('DELETE FROM discounts WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting discount:', error);
    res.status(500).json({ error: 'Failed to delete discount' });
  }
});

// Get discounted price for a product
router.get('/product/:productId', async (req, res) => {
  const { productId } = req.params;

  try {
    const [discounts] = await db.promise().query(`
      SELECT d.*, p.price as original_price
      FROM discounts d
      JOIN products p ON d.product_id = p.id
      WHERE d.product_id = ? 
      AND NOW() BETWEEN d.start_date AND d.end_date
      ORDER BY d.created_at DESC
      LIMIT 1
    `, [productId]);

    if (discounts.length === 0) {
      return res.json({ hasDiscount: false });
    }

    const discount = discounts[0];
    let discountedPrice = discount.original_price;

    if (discount.discount_type === 'percentage') {
      discountedPrice = discount.original_price * (1 - discount.discount_value / 100);
    } else {
      discountedPrice = Math.max(0, discount.original_price - discount.discount_value);
    }

    res.json({
      hasDiscount: true,
      originalPrice: discount.original_price,
      discountedPrice: discountedPrice,
      discount_type: discount.discount_type,
      discount_value: discount.discount_value,
      endDate: discount.end_date
    });
  } catch (error) {
    console.error('Error calculating discount:', error);
    res.status(500).json({ error: 'Failed to calculate discount' });
  }
});

module.exports = router; 