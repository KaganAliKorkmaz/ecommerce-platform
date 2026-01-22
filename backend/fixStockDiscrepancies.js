/**
 * Script to find and fix stock discrepancies for cancelled or refunded orders
 * 
 * Usage:
 *   - Find discrepancies:
 *     node fixStockDiscrepancies.js find
 *   
 *   - Check a specific order (dry run):
 *     node fixStockDiscrepancies.js check <order_id>
 *   
 *   - Fix a specific order:
 *     node fixStockDiscrepancies.js fix <order_id>
 * 
 *   - Fix all discrepancies found:
 *     node fixStockDiscrepancies.js fix-all
 */

const { reconcileOrderStock, findStockDiscrepancies } = require('./utils/stockUtils');

// Helper to format results as a table
function formatTable(data) {
  if (!data || data.length === 0) {
    return 'No data';
  }
  
  // Get all unique keys from all objects
  const keys = [...new Set(data.flatMap(item => Object.keys(item)))];
  
  // Create header row
  const header = keys.join('\t');
  
  // Create data rows
  const rows = data.map(item => {
    return keys.map(key => {
      const value = item[key];
      if (value === undefined || value === null) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return value;
    }).join('\t');
  });
  
  return [header, ...rows].join('\n');
}

async function main() {
  const command = process.argv[2];
  const orderId = process.argv[3];
  
  console.log('='.repeat(50));
  console.log('STOCK DISCREPANCY FIX TOOL');
  console.log('='.repeat(50));
  
  try {
    switch (command) {
      case 'find':
        console.log('\nFinding potential stock discrepancies...');
        const discrepancies = await findStockDiscrepancies(50); // Limit to 50 orders
        
        if (discrepancies.length === 0) {
          console.log('\nNo stock discrepancies found!');
        } else {
          console.log(`\nFound ${discrepancies.length} orders with potential stock discrepancies:`);
          
          // Display order summary
          const summary = discrepancies.map(d => ({
            order_id: d.order_id,
            status: d.status,
            created_at: d.created_at,
            age_hours: d.age_hours,
            item_count: d.items.length
          }));
          
          console.log('\nSummary:');
          console.log(formatTable(summary));
          
          console.log('\nTo check a specific order:');
          console.log('  node fixStockDiscrepancies.js check <order_id>');
          
          console.log('\nTo fix a specific order:');
          console.log('  node fixStockDiscrepancies.js fix <order_id>');
          
          console.log('\nTo fix all orders listed above:');
          console.log('  node fixStockDiscrepancies.js fix-all');
        }
        break;
        
      case 'check':
        if (!orderId) {
          console.error('Error: Order ID is required');
          console.error('Usage: node fixStockDiscrepancies.js check <order_id>');
          process.exit(1);
        }
        
        console.log(`\nChecking order #${orderId} (DRY RUN)...`);
        const checkResult = await reconcileOrderStock(orderId, true);
        
        if (checkResult.errors.length > 0) {
          console.log('\nErrors:');
          console.log(checkResult.errors.join('\n'));
        }
        
        if (checkResult.order) {
          console.log('\nOrder details:');
          console.log(`  Order #${checkResult.order.id}`);
          console.log(`  Status: ${checkResult.order.status}`);
          console.log(`  Created: ${checkResult.order.created_at}`);
          
          if (checkResult.items.length > 0) {
            console.log('\nItems:');
            const itemsTable = checkResult.items.map(item => ({
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: item.quantity,
              current_stock: item.current_stock,
              potential_new_stock: item.potential_new_stock
            }));
            
            console.log(formatTable(itemsTable));
          }
        }
        break;
        
      case 'fix':
        if (!orderId) {
          console.error('Error: Order ID is required');
          console.error('Usage: node fixStockDiscrepancies.js fix <order_id>');
          process.exit(1);
        }
        
        console.log(`\nFixing stock for order #${orderId}...`);
        const fixResult = await reconcileOrderStock(orderId, false);
        
        if (fixResult.errors.length > 0) {
          console.log('\nErrors:');
          console.log(fixResult.errors.join('\n'));
        }
        
        if (fixResult.success) {
          console.log('\nStock updated successfully!');
          
          if (fixResult.items.length > 0) {
            console.log('\nUpdated items:');
            const itemsTable = fixResult.items.map(item => ({
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: item.quantity,
              old_stock: item.current_stock,
              new_stock: item.new_stock,
              change: item.stock_change,
              updated: item.updated ? 'YES' : 'NO'
            }));
            
            console.log(formatTable(itemsTable));
          }
        } else {
          console.log('\nFailed to update stock.');
        }
        break;
        
      case 'fix-all':
        console.log('\nFinding orders to fix...');
        const ordersToFix = await findStockDiscrepancies(50);
        
        if (ordersToFix.length === 0) {
          console.log('\nNo orders to fix!');
          break;
        }
        
        console.log(`\nFound ${ordersToFix.length} orders to fix.`);
        console.log('\nProcessing orders one by one:');
        
        for (const order of ordersToFix) {
          console.log(`\n- Processing order #${order.order_id} (${order.status})...`);
          const result = await reconcileOrderStock(order.order_id, false);
          
          if (result.success) {
            console.log(`  ✅ Successfully fixed order #${order.order_id}`);
            
            // Count updated items
            const updatedItems = result.items.filter(i => i.updated).length;
            console.log(`  Updated ${updatedItems} of ${result.items.length} items`);
          } else {
            console.log(`  ❌ Failed to fix order #${order.order_id}`);
            if (result.errors.length > 0) {
              console.log(`  Errors: ${result.errors.join(', ')}`);
            }
          }
        }
        
        console.log('\nFinished processing all orders.');
        break;
        
      default:
        console.log('Usage:');
        console.log('  Find discrepancies:');
        console.log('    node fixStockDiscrepancies.js find');
        console.log('  Check a specific order (dry run):');
        console.log('    node fixStockDiscrepancies.js check <order_id>');
        console.log('  Fix a specific order:');
        console.log('    node fixStockDiscrepancies.js fix <order_id>');
        console.log('  Fix all discrepancies found:');
        console.log('    node fixStockDiscrepancies.js fix-all');
    }
  } catch (error) {
    console.error('\nError:', error);
  }
  
  console.log('\n' + '='.repeat(50));
}

main().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 