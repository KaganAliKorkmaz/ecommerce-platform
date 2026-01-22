/**
 * Stock utility functions for maintenance and reconciliation
 */

const db = require('../config/db');

/**
 * Reconcile product stock for a specific order
 * This can be used to fix stock issues for orders that were cancelled or refunded
 * 
 * @param {number} orderId - The order ID to reconcile stock for
 * @param {boolean} dryRun - If true, only show what would be updated without making changes
 * @returns {Promise<Object>} Results of the reconciliation
 */
async function reconcileOrderStock(orderId, dryRun = false) {
  const results = {
    order: null,
    items: [],
    success: false,
    dryRun: dryRun,
    errors: []
  };
  
  try {
    // Start transaction directly instead of using a connection
    await db.promise().beginTransaction();
    
    // Get order details
    const [orders] = await db.promise().query(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );
    
    if (orders.length === 0) {
      results.errors.push(`Order #${orderId} not found`);
      return results;
    }
    
    const order = orders[0];
    results.order = order;
    
    // Check if order status indicates stock should be restored
    const stockRestoreStatuses = ['cancelled', 'refund-approved', 'refunded'];
    const shouldRestoreStock = stockRestoreStatuses.includes(order.status);
    
    if (!shouldRestoreStock) {
      results.errors.push(`Order #${orderId} has status "${order.status}" which does not require stock restoration`);
      return results;
    }
    
    // Get all items in the order
    const [items] = await db.promise().query(
      `SELECT oi.*, p.name as product_name, p.stock as current_stock
       FROM order_items oi 
       JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_id = ?`,
      [orderId]
    );
    
    if (items.length === 0) {
      results.errors.push(`No items found for order #${orderId}`);
      return results;
    }
    
    // Check each item
    for (const item of items) {
      const itemResult = {
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        current_stock: item.current_stock,
        updated: false,
        error: null
      };
      
      try {
        if (!dryRun) {
          // Lock the row for update
          await db.promise().query(
            'SELECT id FROM products WHERE id = ? FOR UPDATE',
            [item.product_id]
          );
          
          // Update stock
          const [updateResult] = await db.promise().query(
            'UPDATE products SET stock = stock + ? WHERE id = ?',
            [item.quantity, item.product_id]
          );
          
          itemResult.updated = updateResult.affectedRows > 0;
          
          // Get updated stock value
          const [updatedProduct] = await db.promise().query(
            'SELECT stock FROM products WHERE id = ?',
            [item.product_id]
          );
          
          if (updatedProduct.length > 0) {
            itemResult.new_stock = updatedProduct[0].stock;
            itemResult.stock_change = updatedProduct[0].stock - item.current_stock;
          }
        } else {
          // In dry run mode, just calculate the potential new stock
          itemResult.potential_new_stock = item.current_stock + item.quantity;
          itemResult.updated = false;
        }
      } catch (error) {
        itemResult.error = error.message;
        results.errors.push(`Error updating stock for product ${item.product_id}: ${error.message}`);
      }
      
      results.items.push(itemResult);
    }
    
    // Commit or rollback based on dry run flag
    if (!dryRun) {
      await db.promise().commit();
      results.success = true;
    } else {
      await db.promise().rollback();
      results.success = true; // Dry run is always "successful" as it's just a simulation
    }
    
  } catch (error) {
    try {
      await db.promise().rollback();
    } catch (rollbackError) {
      results.errors.push(`Rollback error: ${rollbackError.message}`);
    }
    results.errors.push(`Failed to reconcile stock: ${error.message}`);
  }
  
  return results;
}

/**
 * Check for any orders with discrepancies where stock should have been restored but wasn't
 * 
 * @param {number} limit - Maximum number of orders to check
 * @returns {Promise<Array>} List of orders with potential stock discrepancies
 */
async function findStockDiscrepancies(limit = 100) {
  const discrepancies = [];
  
  try {
    // Find orders that should have had their stock restored
    const [orders] = await db.promise().query(
      `SELECT o.id, o.status, o.created_at, COUNT(oi.id) as item_count
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE o.status IN ('cancelled', 'refund-approved', 'refunded')
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT ?`,
      [limit]
    );
    
    // For each order, check the items
    for (const order of orders) {
      // Get order items
      const [items] = await db.promise().query(
        `SELECT oi.*, p.name as product_name, p.stock as current_stock
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      
      // Check if this order might be problematic
      // Use created_at instead of updated_at
      const orderAge = (new Date() - new Date(order.created_at)) / (1000 * 60 * 60); // in hours
      
      // If the order was created recently (last 24 hours), it's less likely to have issues
      // Orders older than that might have encountered problems during processing
      if (orderAge > 24) {
        discrepancies.push({
          order_id: order.id,
          status: order.status,
          created_at: order.created_at,
          age_hours: orderAge.toFixed(2),
          items: items.map(item => ({
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            current_stock: item.current_stock
          }))
        });
      }
    }
  } catch (error) {
    console.error('Error finding stock discrepancies:', error);
    throw error;
  }
  
  return discrepancies;
}

module.exports = {
  reconcileOrderStock,
  findStockDiscrepancies
}; 