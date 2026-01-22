const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { decrypt } = require('../utils/simpleEncryption');
const verifyToken = require('../middleware/auth');

router.get('/product/:productId', async (req, res) => {
  const { productId } = req.params;
  
  try {
    const [ratings] = await db.promise().query(
      `SELECT r.*, u.name as user_name 
       FROM ratings r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = ? AND (r.comment_approved = 1 OR r.comment IS NULL OR r.comment = '')
       ORDER BY r.created_at DESC`,
      [productId]
    );
    
    // Decrypt user names with error handling
    const decryptedRatings = ratings.map(rating => {
      let userName = rating.user_name;
      // Check if the name looks like it's encrypted (hexadecimal string)
      if (userName && /^[0-9a-f]{32,}$/i.test(userName)) {
        try {
          userName = decrypt(userName);
        } catch (decryptError) {
          console.warn(`Failed to decrypt name for rating ${rating.id}, using default`);
          userName = 'Anonymous User';
        }
      }
      return {
        ...rating,
        user_name: userName || 'Anonymous User'
      };
    });
    
    const [avgRating] = await db.promise().query(
      `SELECT AVG(rating) as average_rating, COUNT(*) as rating_count
       FROM ratings
       WHERE product_id = ?`,
      [productId]
    );
    
    res.json({
      ratings: decryptedRatings,
      stats: {
        averageRating: avgRating[0].average_rating || 0,
        ratingCount: avgRating[0].rating_count || 0
      }
    });
  } catch (error) {
    console.error('Error fetching ratings:', error);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

router.get('/admin/product/:productId', verifyToken, async (req, res) => {
  if (req.user.role !== 'product_manager') {
    return res.status(403).json({ error: 'Unauthorized. Only product managers can access this endpoint.' });
  }
  const { productId } = req.params;
  
  try {
    const [ratings] = await db.promise().query(
      `SELECT r.*, u.name as user_name 
       FROM ratings r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = ?
       ORDER BY r.created_at DESC`,
      [productId]
    );
    
    // Decrypt user names with error handling
    const decryptedRatings = ratings.map(rating => {
      let userName = rating.user_name;
      // Check if the name looks like it's encrypted (hexadecimal string)
      if (userName && /^[0-9a-f]{32,}$/i.test(userName)) {
        try {
          userName = decrypt(userName);
        } catch (decryptError) {
          console.warn(`Failed to decrypt name for rating ${rating.id}, using default`);
          userName = 'Anonymous User';
        }
      }
      return {
        ...rating,
        user_name: userName || 'Anonymous User'
      };
    });

    res.json(decryptedRatings);
  } catch (error) {
    console.error('Error fetching admin ratings:', error);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

router.get('/admin/pending', verifyToken, async (req, res) => {
  if (req.user.role !== 'product_manager') {
    return res.status(403).json({ error: 'Unauthorized. Only product managers can access this endpoint.' });
  }
  try {
    const [pendingReviews] = await db.promise().query(
      `SELECT r.*, u.name as user_name, p.name as product_name
       FROM ratings r
       JOIN users u ON r.user_id = u.id
       JOIN products p ON r.product_id = p.id
       WHERE r.comment IS NOT NULL AND r.comment_approved = 0
       ORDER BY r.created_at DESC`
    );
    
    // Decrypt user names with error handling
    const decryptedPendingReviews = pendingReviews.map(review => {
      let userName = review.user_name;
      // Check if the name looks like it's encrypted (hexadecimal string)
      if (userName && /^[0-9a-f]{32,}$/i.test(userName)) {
        try {
          userName = decrypt(userName);
        } catch (decryptError) {
          console.warn(`Failed to decrypt name for review ${review.id}, using default`);
          userName = 'Anonymous User';
        }
      }
      return {
        ...review,
        user_name: userName || 'Anonymous User'
      };
    });

    res.json(decryptedPendingReviews);
  } catch (error) {
    console.error('Error fetching pending reviews:', error);
    res.status(500).json({ error: 'Failed to fetch pending reviews' });
  }
});

router.post('/submit', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { productId, rating, comment } = req.body;
  
  if (!productId || !rating) {
    return res.status(400).json({ error: 'Product ID and rating are required' });
  }
  
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }
  
  try {
    const [purchaseCheck] = await db.promise().query(
      `SELECT oi.order_id 
       FROM order_items oi 
       JOIN orders o ON oi.order_id = o.id 
       WHERE o.user_id = ? AND oi.product_id = ? 
       LIMIT 1`,
      [userId, productId]
    );
    
    if (purchaseCheck.length === 0) {
      return res.status(403).json({
        error: 'You can only rate products you have purchased'
      });
    }

    const [deliveredCheck] = await db.promise().query(
      `SELECT o.id 
       FROM orders o 
       JOIN order_items oi ON o.id = oi.order_id 
       WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'delivered'
       LIMIT 1`,
      [userId, productId]
    );
    
    if (deliveredCheck.length === 0) {
      return res.status(403).json({
        error: 'You can only rate and comment on products after they have been delivered'
      });
    }
    
    await db.promise().query(
      `INSERT INTO ratings (user_id, product_id, rating, comment, comment_approved) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, productId, rating, comment, comment ? 0 : null]
    );
    
    res.json({ 
      success: true, 
      message: 'Thank you for your rating. Your comment will be visible after approval.' 
    });
  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

router.put('/approve/:ratingId', verifyToken, async (req, res) => {
  if (req.user.role !== 'product_manager') {
    return res.status(403).json({ error: 'Unauthorized. Only product managers can approve comments.' });
  }
  const { ratingId } = req.params;
  
  try {
    const [ratingToApprove] = await db.promise().query(
      `SELECT user_id, product_id FROM ratings WHERE id = ?`,
      [ratingId]
    );

    if (ratingToApprove.length === 0) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    const { user_id, product_id } = ratingToApprove[0];

    await db.promise().query(
      `UPDATE ratings 
       SET comment_approved = 2 
       WHERE user_id = ? AND product_id = ? AND id != ? AND comment_approved = 1`,
      [user_id, product_id, ratingId]
    );

    await db.promise().query(
      `UPDATE ratings SET comment_approved = 1 WHERE id = ?`,
      [ratingId]
    );
    
    res.json({ success: true, message: 'Comment approved successfully' });
  } catch (error) {
    console.error('Error approving comment:', error);
    res.status(500).json({ error: 'Failed to approve comment' });
  }
});

router.delete('/:ratingId', verifyToken, async (req, res) => {
  if (req.user.role !== 'product_manager') {
    return res.status(403).json({ error: 'Unauthorized. Only product managers can delete comments.' });
  }
  const { ratingId } = req.params;
  
  try {
    await db.promise().query(
      `UPDATE ratings SET comment = NULL, comment_approved = NULL WHERE id = ?`,
      [ratingId]
    );
    
    res.json({ success: true, message: 'Comment removed successfully' });
  } catch (error) {
    console.error('Error removing comment:', error);
    res.status(500).json({ error: 'Failed to remove comment' });
  }
});

module.exports = router; 