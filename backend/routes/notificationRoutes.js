const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/auth');
const { decrypt } = require('../utils/simpleEncryption'); // Assuming decrypt might be needed for metadata or future fields

// All notification routes should require authentication
router.use(verifyToken);

// Get unread notifications for the logged-in user
router.get('/unread', async (req, res) => {
  // Ensure user is logged in (verifyToken middleware should handle this, but double-check)
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized. User not authenticated.' });
  }

  const userId = req.user.id;

  try {
    const [unreadNotifications] = await db.promise().query(
      `SELECT id, type, message, created_at, metadata, is_read
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(unreadNotifications);

  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    res.status(500).json({ error: 'Failed to fetch unread notifications' });
  }
});

// Mark notifications as read
router.patch('/mark-as-read', async (req, res) => {
  // Ensure user is logged in
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized. User not authenticated.' });
  }

  const userId = req.user.id;
  const { notificationIds } = req.body; // Expecting an array of notification IDs, or undefined/empty for all

  // If notificationIds is not provided or empty, mark all unread as read
  if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
    try {
      const [result] = await db.promise().query(
        `UPDATE notifications
         SET is_read = TRUE
         WHERE user_id = ? AND is_read = FALSE`,
        [userId]
      );
      console.log(`Mark all as read: Marked ${result.affectedRows} notifications for user ${userId}`);
      return res.json({ success: true, message: `Marked ${result.affectedRows} unread notifications as read.` });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  }

  // If notificationIds are provided, mark specific notifications as read
  try {
    // Ensure that the notifications belong to the logged-in user
    const [result] = await db.promise().query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE user_id = ? AND id IN (?)`,
      [userId, notificationIds]
    );

    // Check if any rows were affected (optional, but good practice)
    if (result.affectedRows === 0) {
       console.warn(`Mark as read: No notifications found for user ${userId} with IDs ${notificationIds}`);
    }

    res.json({ success: true, message: `Marked ${result.affectedRows} notifications as read.` });

  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Get unread notification count for the logged-in user
router.get('/count/unread', async (req, res) => {
  // Ensure user is logged in
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized. User not authenticated.' });
  }

  const userId = req.user.id;

  try {
    const [result] = await db.promise().query(
      `SELECT COUNT(*) as unread_count
       FROM notifications
       WHERE user_id = ? AND is_read = FALSE`,
      [userId]
    );

    const unreadCount = result[0] ? result[0].unread_count : 0;
    res.json({ count: unreadCount });

  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    res.status(500).json({ error: 'Failed to fetch unread notification count' });
  }
});

// Delete a notification
router.delete('/:notificationId', async (req, res) => {
  // Ensure user is logged in
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized. User not authenticated.' });
  }

  const userId = req.user.id;
  const { notificationId } = req.params;

  try {
    // Ensure that the notification belongs to the logged-in user before deleting
    const [result] = await db.promise().query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found or does not belong to this user' });
    }

    res.json({ success: true, message: 'Notification deleted successfully.' });

  } catch (error) {
    console.error(`Error deleting notification ${notificationId}:`, error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// TODO: Add endpoints for marking notifications as read (single or all)

module.exports = router; 