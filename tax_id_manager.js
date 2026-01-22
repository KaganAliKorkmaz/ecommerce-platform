const mysql = require('mysql2/promise');
const { encrypt, decrypt } = require('./backend/utils/simpleEncryption');
const fs = require('fs-extra');
const path = require('path');

/**
 * Tax ID Manager - A comprehensive tool for managing tax IDs in the database
 * 
 * This script provides the following functionality:
 * 1. Check if the tax_id column exists and add it if it doesn't
 * 2. Update the column size to accommodate encrypted values
 * 3. Check and update tax IDs for specific users
 * 4. Regenerate invoices with tax IDs
 * 
 * Usage: node tax_id_manager.js [command] [userId] [taxId]
 * Commands:
 *   setup       - Set up the tax_id column in the database
 *   check       - Check tax ID for a specific user
 *   update      - Update tax ID for a specific user
 *   regenerate  - Regenerate invoice with tax ID for a specific user
 * 
 * Examples:
 *   node tax_id_manager.js setup
 *   node tax_id_manager.js check 8
 *   node tax_id_manager.js update 8 123456789ABC
 *   node tax_id_manager.js regenerate 8
 */

// Database connection configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '2001',
  database: 'online_store',
};

// Main function to handle all tax ID operations
async function manageTaxId() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const userId = args[1] ? parseInt(args[1]) : null;
  const taxId = args[2] || null;
  
  try {
    // Create database connection
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');
    
    // Execute the appropriate command
    switch (command) {
      case 'setup':
        await setupTaxIdColumn(connection);
        break;
      case 'check':
        if (!userId) {
          console.error('Error: User ID is required for the check command');
          console.log('Usage: node tax_id_manager.js check [userId]');
          process.exit(1);
        }
        await checkTaxId(connection, userId);
        break;
      case 'update':
        if (!userId || !taxId) {
          console.error('Error: User ID and tax ID are required for the update command');
          console.log('Usage: node tax_id_manager.js update [userId] [taxId]');
          process.exit(1);
        }
        await updateTaxId(connection, userId, taxId);
        break;
      case 'regenerate':
        if (!userId) {
          console.error('Error: User ID is required for the regenerate command');
          console.log('Usage: node tax_id_manager.js regenerate [userId]');
          process.exit(1);
        }
        await regenerateInvoice(connection, userId);
        break;
      case 'help':
      default:
        showHelp();
        break;
    }
    
    // Close the connection
    await connection.end();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Set up the tax_id column in the database
async function setupTaxIdColumn(connection) {
  console.log('Setting up tax_id column...');
  
  try {
    // Check if tax_id column already exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'online_store'
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'tax_id'
    `);
    
    if (columns.length > 0) {
      console.log('tax_id column already exists. Checking column size...');
      
      // Check column size
      const [columnInfo] = await connection.query(`
        SELECT CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'online_store'
          AND TABLE_NAME = 'users'
          AND COLUMN_NAME = 'tax_id'
      `);
      
      const columnSize = columnInfo[0].CHARACTER_MAXIMUM_LENGTH;
      console.log(`Current tax_id column size: ${columnSize}`);
      
      // Update column size if needed
      if (columnSize < 255) {
        console.log('Updating tax_id column size to VARCHAR(255)...');
        await connection.query(`
          ALTER TABLE users
          MODIFY COLUMN tax_id VARCHAR(255) DEFAULT NULL
        `);
        console.log('tax_id column size updated successfully to VARCHAR(255)!');
      } else {
        console.log('tax_id column size is already sufficient.');
      }
    } else {
      // Add tax_id column
      console.log('Adding tax_id column...');
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN tax_id VARCHAR(255) DEFAULT NULL
      `);
      console.log('tax_id column added successfully!');
      
      // Create index for faster lookups
      await connection.query(`
        CREATE INDEX idx_tax_id ON users(tax_id)
      `);
      console.log('Index created for tax_id column.');
      
      // Update table comment
      await connection.query(`
        ALTER TABLE users
        COMMENT = 'Contains user information including customer tax IDs'
      `);
      console.log('Table comment updated.');
    }
    
    console.log('Tax ID column setup completed successfully!');
  } catch (error) {
    console.error('Error setting up tax_id column:', error);
    throw error;
  }
}

// Check tax ID for a specific user
async function checkTaxId(connection, userId) {
  console.log(`Checking tax ID for user ${userId}...`);
  
  try {
    // Get user information
    const [users] = await connection.query(
      'SELECT id, name, email, tax_id FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      console.log(`User ${userId} not found`);
      return;
    }
    
    const user = users[0];
    console.log('User ID:', user.id);
    
    // Try to decrypt the name and email for display
    try {
      user.name = decrypt(user.name);
      user.email = decrypt(user.email);
    } catch (error) {
      console.log('Could not decrypt name or email (might not be encrypted)');
    }
    
    console.log('Name:', user.name);
    console.log('Email:', user.email);
    
    // Check if tax ID exists and decrypt it
    if (user.tax_id) {
      console.log('Tax ID (encrypted):', user.tax_id);
      try {
        const decryptedTaxId = decrypt(user.tax_id);
        console.log('Tax ID (decrypted):', decryptedTaxId);
      } catch (error) {
        console.error('Error decrypting tax ID:', error);
      }
    } else {
      console.log('No tax ID found for this user');
    }
  } catch (error) {
    console.error('Error checking tax ID:', error);
    throw error;
  }
}

// Update tax ID for a specific user
async function updateTaxId(connection, userId, taxId) {
  console.log(`Updating tax ID for user ${userId} to ${taxId}...`);
  
  try {
    // Check if user exists
    const [users] = await connection.query(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      console.log(`User ${userId} not found`);
      return;
    }
    
    // Encrypt the tax ID
    const encryptedTaxId = encrypt(taxId);
    console.log('Tax ID (encrypted):', encryptedTaxId);
    
    // Update the user's tax ID
    const [result] = await connection.query(
      'UPDATE users SET tax_id = ? WHERE id = ?',
      [encryptedTaxId, userId]
    );
    
    console.log(`Updated tax ID for user ${userId}`);
    console.log(`Rows affected: ${result.affectedRows}`);
    
    // Verify the update
    await checkTaxId(connection, userId);
  } catch (error) {
    console.error('Error updating tax ID:', error);
    throw error;
  }
}

// Regenerate invoice with tax ID for a specific user
async function regenerateInvoice(connection, userId) {
  console.log(`Regenerating invoice for user ${userId}...`);
  
  try {
    // Check if the invoiceGenerator module is available
    let getOrGenerateInvoice;
    try {
      getOrGenerateInvoice = require('./backend/utils/invoiceGenerator').getOrGenerateInvoice;
    } catch (error) {
      console.error('Error: Could not load invoiceGenerator module. Make sure it exists and is properly configured.');
      return;
    }
    
    // Get the latest order for the user
    const [orders] = await connection.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 1',
      [userId]
    );
    
    if (orders.length === 0) {
      console.log(`No orders found for user ${userId}`);
      return;
    }
    
    const order = orders[0];
    console.log('Order ID:', order.id);
    
    // Get order items
    const [items] = await connection.query(
      `SELECT oi.*, p.name as product_name 
       FROM order_items oi 
       JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_id = ?`,
      [order.id]
    );
    
    order.items = items || [];
    console.log('Order items:', order.items.length);
    
    // Get user information
    const [users] = await connection.query(
      'SELECT id, name, email, address, tax_id FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      console.log(`User ${userId} not found`);
      return;
    }
    
    const user = users[0];
    
    // Decrypt user information
    try {
      user.name = decrypt(user.name);
      user.email = decrypt(user.email);
      user.address = decrypt(user.address);
      if (user.tax_id) {
        user.tax_id = decrypt(user.tax_id);
      }
    } catch (error) {
      console.error('Error decrypting user information:', error);
    }
    
    console.log('User information:');
    console.log('- Name:', user.name);
    console.log('- Email:', user.email);
    console.log('- Address:', user.address);
    console.log('- Tax ID:', user.tax_id);
    
    // Delete existing invoice files for this order
    const invoiceDir = path.join(__dirname, 'backend', 'invoices');
    try {
      const files = await fs.readdir(invoiceDir);
      const invoicePattern = new RegExp(`invoice-${order.id}-\\d+\\.pdf`);
      
      for (const file of files) {
        if (invoicePattern.test(file)) {
          console.log('Deleting existing invoice file:', file);
          await fs.unlink(path.join(invoiceDir, file));
        }
      }
    } catch (error) {
      console.error('Error deleting existing invoice files:', error);
    }
    
    // Generate new invoice
    console.log('Generating new invoice...');
    const invoicePath = await getOrGenerateInvoice(order, user);
    console.log('Invoice generated at:', invoicePath);
  } catch (error) {
    console.error('Error regenerating invoice:', error);
    throw error;
  }
}

// Show help information
function showHelp() {
  console.log(`
Tax ID Manager - A comprehensive tool for managing tax IDs in the database

Usage: node tax_id_manager.js [command] [userId] [taxId]

Commands:
  setup       - Set up the tax_id column in the database
  check       - Check tax ID for a specific user
  update      - Update tax ID for a specific user
  regenerate  - Regenerate invoice with tax ID for a specific user
  help        - Show this help information

Examples:
  node tax_id_manager.js setup
  node tax_id_manager.js check 8
  node tax_id_manager.js update 8 123456789ABC
  node tax_id_manager.js regenerate 8
  `);
}

// Run the main function
manageTaxId(); 