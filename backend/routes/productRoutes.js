const express = require("express");
const router = express.Router();
const db = require("../config/db");
const verifyToken = require("../middleware/auth");
const { sendPriceApprovalNotification } = require('../utils/emailService');

router.get("/", (req, res) => {
  const { sort } = req.query;
  
  let query;
  
  if (sort === 'popularity') {
    query = "SELECT * FROM products WHERE visible = 1 ORDER BY RAND()";
  } else {
    query = "SELECT * FROM products WHERE visible = 1";
  }
  db.query(query, (err, results) => {
    if (err) {
      console.error('Query error:', err);
      return res.status(500).json({ error: "Error retrieving products." });
    }
    res.json(results);
  });
});

router.get("/categories/all", (req, res) => {
  db.query("SELECT * FROM categories", (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Error retrieving categories." });
    }
    res.json(results);
  });
});

router.post("/categories/create", verifyToken, (req, res) => {
  if (req.user.role !== 'product_manager') {
    return res.status(403).json({ error: "Unauthorized. Only product managers can access this endpoint." });
  }
  
  try {
    const { name, description = "" } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Category name is required." });
    }
    
    const query = "INSERT INTO categories (name, description) VALUES (?, ?)";
    
    db.query(query, [name, description], (err, results) => {
      if (err) {
      console.error('Insert error details:', err);
      return res.status(500).json({ error: `Error creating category: ${err.message}` });
    }
    res.status(201).json({ id: results.insertId, name, description, message: "Category created successfully" });
    });
  } catch (error) {
    console.error("Exception in category creation:", error);
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
});

router.delete("/categories/:id", verifyToken, (req, res) => {
  if (req.user.role !== 'product_manager') {
    return res.status(403).json({ error: "Unauthorized. Only product managers can access this endpoint." });
  }
  
  const categoryId = req.params.id;
  
  db.query(
    "SELECT COUNT(*) as count FROM products WHERE category_id = ?",
    [categoryId],
    (err, results) => {
      if (err) {
        console.error('Query error:', err);
        return res.status(500).json({ error: "Error checking category references." });
      }
      
      if (results[0].count > 0) {
        return res.status(400).json({ 
          error: "Cannot delete category as it contains products. Please move or delete the products first."
        });
      }
      
      db.query(
        "DELETE FROM categories WHERE id = ?",
        [categoryId],
        (err, results) => {
          if (err) {
            console.error('Delete error:', err);
            return res.status(500).json({ error: "Error deleting category." });
          }
          
          if (results.affectedRows === 0) {
            return res.status(404).json({ error: "Category not found." });
          }
          
          res.json({ message: "Category deleted successfully" });
        }
      );
    }
  );
});

router.get("/category/:categoryId", (req, res) => {
  const categoryId = req.params.categoryId;
  const { sort } = req.query;
  
  let query;
  
  if (sort === 'popularity') {
    query = "SELECT * FROM products WHERE category_id = ? AND visible = 1 ORDER BY RAND()";
  } else {
    query = "SELECT * FROM products WHERE category_id = ? AND visible = 1";
  }
  
  db.query(query, [categoryId], (err, results) => {
    if (err) {
      console.error('Query error for category products:', err);
      return res.status(500).json({ error: "Error retrieving products by category." });
    }
    res.json(results);
  });
});

router.get("/search/:query", (req, res) => {
  const searchQuery = `%${req.params.query}%`;
  const { sort } = req.query;
  
  let query;
  
  if (sort === 'popularity') {
    query = "SELECT * FROM products WHERE (name LIKE ? OR description LIKE ? OR model LIKE ?) AND visible = 1 ORDER BY RAND()";
  } else {
    query = "SELECT * FROM products WHERE (name LIKE ? OR description LIKE ? OR model LIKE ?) AND visible = 1";
  }
  
  db.query(
    query,
    [searchQuery, searchQuery, searchQuery],
    (err, results) => {
      if (err) {
        console.error('Query error for search:', err);
        return res.status(500).json({ error: "Error searching products." });
      }
      res.json(results);
    }
  );
});

// Get latest products
router.get("/latest/:limit", (req, res) => {
  const limit = parseInt(req.params.limit) || 4;
  const query = "SELECT * FROM products WHERE visible = 1 ORDER BY id DESC LIMIT ?";
  
  db.query(query, [limit], (err, results) => {
    if (err) {
      console.error('Query error:', err);
      return res.status(500).json({ error: "Error retrieving latest products." });
    }
    res.json(results);
  });
});

router.get("/most-recently-rated/:limit", (req, res) => {
  const limit = parseInt(req.params.limit) || 4;
  
  const query = `
    SELECT p.*, MAX(r.created_at) as latest_rating_date 
    FROM products p
    JOIN ratings r ON p.id = r.product_id
    WHERE p.visible = 1 AND r.comment_approved = 1
    GROUP BY p.id
    ORDER BY latest_rating_date DESC
    LIMIT ?
  `;
  
  db.query(query, [limit], (err, results) => {
    if (err) {
      console.error('Query error:', err);
      return res.status(500).json({ error: "Error retrieving recently rated products." });
    }
    res.json(results);
  });
});

router.get("/admin/all", verifyToken, (req, res) => {
  if (req.user.role !== 'product_manager') {
    return res.status(403).json({ error: "Unauthorized. Only product managers can access this endpoint." });
  }

  const query = "SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id";
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Query error:', err);
      return res.status(500).json({ error: "Error retrieving products." });
    }
    res.json(results);
  });
});

router.post("/admin/create", verifyToken, (req, res) => {
  if (req.user.role !== 'product_manager') {
    return res.status(403).json({ error: "Unauthorized. Only product managers can access this endpoint." });
  }
  
  try {
    const { 
      name, 
      model = "", 
      serial_number = "", 
      description = "", 
      stock = 0,
      price, 
      cost = null,
      warranty_months = 0, 
      distributor_info = "", 
      category_id 
    } = req.body;
    
    const priceValue = (price === '' || price === 0 || price === '0' || price === undefined) ? null : price;
    const costValue = (cost === '' || cost === 0 || cost === '0' || cost === undefined) ? null : cost;
    
    if (!name) {
      return res.status(400).json({ error: "Product name is required." });
    }
    
    if (!category_id) {
      return res.status(400).json({ error: "Category is required." });
    }
    
    const visibilityValue = 0;
    const priceApprovedValue = 0;
    
    const query = `
      INSERT INTO products 
      (name, model, serial_number, description, stock, price, cost, warranty_months, 
       distributor_info, category_id, visible, price_approved) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.query(
      query,
      [name, model, serial_number, description, stock, priceValue, costValue, warranty_months, 
       distributor_info, category_id, visibilityValue, priceApprovedValue],
      (err, results) => {
        if (err) {
          console.error('Insert error details:', err);
          return res.status(500).json({ error: `Error creating product: ${err.message}` });
        }
        res.status(201).json({ id: results.insertId, message: "Product created successfully" });
      }
    );
  } catch (error) {
    console.error("Exception in product creation:", error);
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
});

router.put("/admin/:id", verifyToken, (req, res) => {
  if (req.user.role !== 'product_manager' && req.user.role !== 'sales_manager') {
    return res.status(403).json({ error: "Unauthorized. Only product or sales managers can access this endpoint." });
  }
  
  const productId = req.params.id;
  const { name, model, serial_number, description, stock, price, cost, warranty_months, distributor_info, category_id, visible } = req.body;
  
  const priceValue = (price === '' || price === 0 || price === '0' || price === undefined) ? null : price;
  const costValue = (cost === '' || cost === 0 || cost === '0' || cost === undefined) ? null : cost;
  
  let queryParams = [];
  let query = '';
  
  if (req.user.role === 'product_manager') {
    query = `
      UPDATE products 
      SET name = ?, model = ?, serial_number = ?, description = ?, stock = ?, 
          cost = ?, warranty_months = ?, distributor_info = ?, category_id = ?
      WHERE id = ?
    `;
    queryParams = [
      name, model, serial_number, description, stock, 
      costValue, warranty_months, distributor_info, category_id, productId
    ];
  } else if (req.user.role === 'sales_manager') {
    query = `
      UPDATE products 
      SET price = ?, visible = ?
      WHERE id = ?
    `;
    queryParams = [priceValue, visible, productId];
  }
  
  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error('Update error:', err);
      return res.status(500).json({ error: `Error updating product: ${err.message}` });
    }
    
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Product not found." });
    }
    
    res.json({ message: "Product updated successfully" });
  });
});

router.delete("/admin/:id", verifyToken, (req, res) => {
  if (req.user.role !== 'product_manager') {
    return res.status(403).json({ error: "Unauthorized. Only product managers can access this endpoint." });
  }
  
  const productId = req.params.id;
  
  db.query(
    "SELECT COUNT(*) as count FROM order_items WHERE product_id = ?",
    [productId],
    (err, results) => {
      if (err) {
        console.error('Query error:', err);
        return res.status(500).json({ error: "Error checking product references." });
      }
      
      if (results[0].count > 0) {
        return res.status(400).json({ 
          error: "Cannot delete product as it is referenced in orders. Consider setting visibility to false instead."
        });
      }
      
      db.query(
        "DELETE FROM products WHERE id = ?",
        [productId],
        (err, results) => {
          if (err) {
            console.error('Delete error:', err);
            return res.status(500).json({ error: "Error deleting product." });
          }
          
          if (results.affectedRows === 0) {
            return res.status(404).json({ error: "Product not found." });
          }
          
          res.json({ message: "Product deleted successfully" });
        }
      );
    }
  );
});

// Update product stock
router.put("/admin/stock/:id", verifyToken, (req, res) => {
  // Check if user has product_manager role
  if (req.user.role !== 'product_manager') {
    return res.status(403).json({ error: "Unauthorized. Only product managers can access this endpoint." });
  }
  
  const productId = req.params.id;
  const { stock } = req.body;
  
  if (stock === undefined) {
    return res.status(400).json({ error: "Stock value is required." });
  }
  
  db.query(
    "UPDATE products SET stock = ? WHERE id = ?",
    [stock, productId],
    (err, results) => {
      if (err) {
        console.error('Update stock error:', err);
        return res.status(500).json({ error: "Error updating product stock." });
      }
      
      if (results.affectedRows === 0) {
        return res.status(404).json({ error: "Product not found." });
      }
      
      res.json({ message: "Product stock updated successfully" });
    }
  );
});

// Update product visibility (accessible to both product_manager and sales_manager)
router.patch("/admin/:id/visibility", verifyToken, (req, res) => {
  // Check if user has proper role
  if (req.user.role !== 'product_manager' && req.user.role !== 'sales_manager') {
    return res.status(403).json({ error: "Unauthorized. Only product or sales managers can update visibility." });
  }
  
  const productId = req.params.id;
  const { visible } = req.body;
  
  if (visible === undefined) {
      return res.status(400).json({ error: "Visibility value is required." });
    }
    
    if (req.user.role === 'product_manager' && visible === 1) {
    db.query("SELECT price FROM products WHERE id = ?", [productId], (err, results) => {
      if (err) {
        console.error('Query error:', err);
        return res.status(500).json({ error: "Error checking product price." });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ error: "Product not found." });
      }
      
      const product = results[0];
      
      if (!product.price || parseFloat(product.price) === 0) {
        return res.status(400).json({ 
          error: "Products need to have a price set by a Sales Manager before they can be made visible to customers." 
        });
      }
      
      // Price is set, so product can be made visible
      updateVisibility(productId, visible, res);
    });
  } else {
    // Product manager hiding a product, or sales manager changing visibility
    updateVisibility(productId, visible, res);
  }
});

// Helper function to update visibility
function updateVisibility(productId, visible, res) {
  db.query(
    "UPDATE products SET visible = ? WHERE id = ?",
    [visible, productId],
    (err, results) => {
      if (err) {
        console.error('Update visibility error:', err);
        return res.status(500).json({ error: "Error updating product visibility." });
      }
      
      if (results.affectedRows === 0) {
        return res.status(404).json({ error: "Product not found." });
      }
      
      res.json({ message: "Product visibility updated successfully" });
    }
  );
}

router.get('/sales', verifyToken, (req, res) => {
  if (req.user.role !== 'sales_manager') {
    return res.status(403).json({ error: "Unauthorized. Only sales managers can access this endpoint." });
  }

  const query = `
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    ORDER BY p.id ASC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Query error on /sales route:', err);
      return res.status(500).json({ error: "Error retrieving products for sales." });
    }
    res.json(results);
  });
});

router.get('/unapproved', verifyToken, async (req, res) => {
  if (!req.user || req.user.role !== 'sales_manager') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const [products] = await db.promise().query(
      'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.price_approved = FALSE'
    );
    res.json(products);
  } catch (error) {
    console.error('Error fetching unapproved products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get("/:id", (req, res) => {
  const productId = req.params.id;
  db.query("SELECT * FROM products WHERE id = ? AND visible = 1", [productId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Error retrieving product." });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Product not found." });
    }
    res.json(results[0]);
  });
});

router.patch('/:id/approve', verifyToken, (req, res) => {
  if (req.user.role !== 'sales_manager') {
    return res.status(403).json({ error: "Unauthorized. Only sales managers can access this endpoint." });
  }

  const { id } = req.params;
  const { price } = req.body;

  if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
    return res.status(400).json({ error: 'Invalid price. Price must be a positive number.' });
  }

  const priceValue = parseFloat(price);

  db.query(
    'UPDATE products SET price = ?, price_approved = TRUE, visible = 1 WHERE id = ?',
    [priceValue, id],
    (err, results) => {
      if (err) {
        console.error('Error updating product price:', err);
        return res.status(500).json({ error: 'Error updating product price.' });
      }
      
      if (results.affectedRows === 0) {
        console.log('Product not found:', id);
        return res.status(404).json({ error: 'Product not found.' });
      }
      
      res.json({ message: 'Product price approved and set to visible successfully' });
      
      db.query('SELECT name FROM products WHERE id = ?', [id], (err, productResults) => {
        if (err || productResults.length === 0) {
          console.error('Error fetching product for notification:', err);
          return; // Don't stop the main flow for notification errors
        }
        
        const productName = productResults[0].name;
        
        db.query(
          `SELECT DISTINCT u.email, u.name 
           FROM wishlist w 
           JOIN users u ON w.user_id = u.id 
           WHERE w.product_id = ?`,
          [id],
          (err, userResults) => {
            if (err) {
              console.error('Error fetching users for notification:', err);
              return;
            }
            
            for (const user of userResults) {
              // Notification logic would go here
            }
          }
        );
      });
    }
  );
});

router.get('/', async (req, res) => {
  try {
    const [products] = await db.promise().query(
      'SELECT * FROM products WHERE price_approved = TRUE'
    );
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
