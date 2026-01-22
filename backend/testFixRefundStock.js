/**
 * Simple test to directly update a product's stock
 * Run with: node testFixRefundStock.js <product_id> <quantity_to_add>
 */

const db = require('./config/db');

async function testDirectStockUpdate(productId, quantity) {
  try {
    console.log(`\n======= TESTING DIRECT STOCK UPDATE FOR PRODUCT #${productId} =======`);
    
    // Check if product exists
    const [products] = await db.promise().query(
      'SELECT * FROM products WHERE id = ?',
      [productId]
    );
    
    if (products.length === 0) {
      console.error(`Product #${productId} not found!`);
      process.exit(1);
    }
    
    const product = products[0];
    console.log(`Found product #${productId}: ${product.name}`);
    console.log(`Current stock: ${product.stock}`);
    
    // Directly update stock
    const updateQuery = 'UPDATE products SET stock = stock + ? WHERE id = ?';
    console.log(`\nExecuting query: ${updateQuery}`);
    console.log(`Parameters: [${quantity}, ${productId}]`);
    
    const [updateResult] = await db.promise().query(updateQuery, [quantity, productId]);
    
    console.log('\nUpdate result:', JSON.stringify(updateResult, null, 2));
    
    // Verify update
    const [updatedProducts] = await db.promise().query(
      'SELECT * FROM products WHERE id = ?',
      [productId]
    );
    
    if (updatedProducts.length === 0) {
      console.error(`Product #${productId} not found after update!`);
    } else {
      const updatedProduct = updatedProducts[0];
      console.log(`\nProduct after update: ${updatedProduct.name}`);
      console.log(`New stock: ${updatedProduct.stock} (was: ${product.stock}, change: ${updatedProduct.stock - product.stock})`);
      
      if (updatedProduct.stock !== product.stock + parseInt(quantity)) {
        console.warn(`WARNING: Stock change doesn't match expected value!`);
        console.warn(`Expected: ${product.stock} + ${quantity} = ${product.stock + parseInt(quantity)}`);
        console.warn(`Actual: ${updatedProduct.stock}`);
      } else {
        console.log(`SUCCESS: Stock updated correctly!`);
      }
    }
    
    console.log('\n======= TEST COMPLETED =======');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Close the database connection
    db.end();
  }
}

// Get command line arguments
const productId = process.argv[2] || 1;
const quantity = process.argv[3] || 1;

// Run the test
testDirectStockUpdate(productId, quantity); 