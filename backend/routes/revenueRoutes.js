const express = require("express");
const router = express.Router();
const db = require("../config/db");
const verifyToken = require("../middleware/auth");

// Get revenue and profit for a date range (sales manager only)
router.get("/calculate", verifyToken, (req, res) => {
  console.log('GET /revenue/calculate - User:', req.user?.name, 'Role:', req.user?.role);
  
  // Check if user has sales_manager role
  if (req.user.role !== 'sales_manager') {
    console.log('Access denied to /revenue/calculate route - incorrect role:', req.user.role);
    return res.status(403).json({ error: "Unauthorized. Only sales managers can access this endpoint." });
  }

  // Get date range from query parameters
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ error: "Start date and end date are required" });
  }

  console.log(`Calculating revenue for period: ${startDate} to ${endDate}`);

  // Query to get orders and their items within the date range
  const query = `
    SELECT 
      o.id as order_id,
      o.created_at,
      o.total_amount,
      oi.product_id,
      oi.quantity,
      oi.price as selling_price,
      p.cost,
      p.name as product_name
    FROM 
      orders o
    JOIN 
      order_items oi ON o.id = oi.order_id
    LEFT JOIN
      products p ON oi.product_id = p.id
    WHERE 
      o.created_at BETWEEN ? AND ?
      AND o.status != 'cancelled'
    ORDER BY
      o.created_at
  `;
  
  db.query(query, [startDate, endDate], (err, results) => {
    if (err) {
      console.error('Query error:', err);
      return res.status(500).json({ error: "Error retrieving revenue data." });
    }
    
    // Calculate revenue and profit
    let totalRevenue = 0;
    let totalCost = 0;
    
    // Group results by date for the chart
    const dailyData = {};
    
    results.forEach(item => {
      const itemRevenue = parseFloat(item.selling_price) * item.quantity;
      totalRevenue += itemRevenue;
      
      // Calculate cost (either custom cost or 50% of selling price)
      const itemCost = item.cost 
        ? parseFloat(item.cost) * item.quantity 
        : (parseFloat(item.selling_price) * 0.5) * item.quantity;
      
      totalCost += itemCost;
      
      // Format date for grouping (YYYY-MM-DD)
      const dateKey = new Date(item.created_at).toISOString().split('T')[0];
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          revenue: 0,
          cost: 0,
          profit: 0
        };
      }
      
      dailyData[dateKey].revenue += itemRevenue;
      dailyData[dateKey].cost += itemCost;
      dailyData[dateKey].profit += (itemRevenue - itemCost);
    });
    
    // Convert daily data to array and sort by date
    const chartData = Object.values(dailyData).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    const totalProfit = totalRevenue - totalCost;
    
    res.json({
      startDate,
      endDate,
      totalRevenue,
      totalCost,
      totalProfit,
      chartData,
      orderCount: new Set(results.map(item => item.order_id)).size
    });
  });
});

// Get monthly revenue summary for the current year (sales manager only)
router.get("/monthly-summary", verifyToken, (req, res) => {
  console.log('GET /revenue/monthly-summary - User:', req.user?.name, 'Role:', req.user?.role);
  
  // Check if user has sales_manager role
  if (req.user.role !== 'sales_manager') {
    return res.status(403).json({ error: "Unauthorized. Only sales managers can access this endpoint." });
  }

  const currentYear = new Date().getFullYear();
  
  // Query to get monthly aggregated data
  const query = `
    SELECT 
      MONTH(o.created_at) as month,
      SUM(oi.quantity * oi.price) as revenue,
      COUNT(DISTINCT o.id) as order_count,
      SUM(oi.quantity) as items_sold
    FROM 
      orders o
    JOIN 
      order_items oi ON o.id = oi.order_id
    WHERE 
      YEAR(o.created_at) = ?
      AND o.status != 'cancelled'
    GROUP BY
      MONTH(o.created_at)
    ORDER BY
      month
  `;
  
  db.query(query, [currentYear], (err, results) => {
    if (err) {
      console.error('Query error:', err);
      return res.status(500).json({ error: "Error retrieving monthly summary." });
    }
    
    // Fill in missing months with zero values
    const monthlySummary = Array(12).fill().map((_, i) => {
      const month = i + 1;
      const existingData = results.find(item => item.month === month);
      
      return {
        month,
        monthName: new Date(currentYear, i, 1).toLocaleString('default', { month: 'long' }),
        revenue: existingData ? parseFloat(existingData.revenue) : 0,
        orderCount: existingData ? existingData.order_count : 0,
        itemsSold: existingData ? existingData.items_sold : 0
      };
    });
    
    res.json({
      year: currentYear,
      monthlySummary
    });
  });
});

module.exports = router; 