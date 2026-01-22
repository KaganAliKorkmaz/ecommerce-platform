const express = require("express");
const router = express.Router();
const db = require("../config/db");
const verifyToken = require("../middleware/auth");

// All wishlist routes require authentication
router.use(verifyToken);

// Get user's wishlist items
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT w.id as wishlist_id, p.* 
      FROM wishlist w
      JOIN products p ON w.product_id = p.id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `;
    
    const [items] = await db.promise().query(query, [userId]);
    
    res.json(items);
  } catch (err) {
    console.error("Error fetching wishlist:", err);
    res.status(500).json({ error: "Error retrieving wishlist items" });
  }
});

// Add product to wishlist
router.post("/:productId", async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = req.params.productId;
    
    // Check if product exists
    const [products] = await db.promise().query(
      "SELECT * FROM products WHERE id = ? AND visible = 1", 
      [productId]
    );
    
    if (products.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    // Check if item is already in wishlist
    const [existingItems] = await db.promise().query(
      "SELECT * FROM wishlist WHERE user_id = ? AND product_id = ?", 
      [userId, productId]
    );
    
    if (existingItems.length > 0) {
      return res.status(409).json({ message: "Item already in wishlist" });
    }
    
    // Add to wishlist
    await db.promise().query(
      "INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)", 
      [userId, productId]
    );
    
    res.status(201).json({ message: "Item added to wishlist" });
  } catch (err) {
    console.error("Error adding to wishlist:", err);
    res.status(500).json({ error: "Failed to add item to wishlist" });
  }
});

// Remove product from wishlist
router.delete("/:productId", async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = req.params.productId;
    
    await db.promise().query(
      "DELETE FROM wishlist WHERE user_id = ? AND product_id = ?", 
      [userId, productId]
    );
    
    res.json({ message: "Item removed from wishlist" });
  } catch (err) {
    console.error("Error removing from wishlist:", err);
    res.status(500).json({ error: "Failed to remove item from wishlist" });
  }
});

// Check if a product is in the user's wishlist
router.get("/check/:productId", async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = req.params.productId;
    
    const [items] = await db.promise().query(
      "SELECT * FROM wishlist WHERE user_id = ? AND product_id = ?", 
      [userId, productId]
    );
    
    res.json({ inWishlist: items.length > 0 });
  } catch (err) {
    console.error("Error checking wishlist status:", err);
    res.status(500).json({ error: "Failed to check wishlist status" });
  }
});

module.exports = router; 