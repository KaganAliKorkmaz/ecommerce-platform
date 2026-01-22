const bcrypt = require('bcryptjs');
const mysql = require('mysql2');
const { encrypt } = require('./backend/utils/simpleEncryption');
require('dotenv').config();

const password = 'sales123'; // Sales manager password
const email = 'sale@example.com'; // Sales manager email
const address = 'Sales Office Address'; // Sales manager address

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '2001',
  database: 'online_store',
});

async function createSalesManager() {
  try {
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Encrypt user data
    const encryptedEmail = encrypt(email.trim().toLowerCase());
    const encryptedName = encrypt('Sales Manager');
    const encryptedAddress = encrypt(address);

    // Add sales manager user
    const query = `
      INSERT INTO users (email, password, name, role, address) 
      VALUES (?, ?, ?, 'sales_manager', ?)
    `;

    db.query(query, [encryptedEmail, hashedPassword, encryptedName, encryptedAddress], (err, result) => {
      if (err) {
        console.error('Error creating sales manager:', err);
        process.exit(1);
      }
      console.log('Sales manager created successfully!');
      console.log('Email:', email);
      console.log('Password:', password);
      process.exit(0);
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createSalesManager(); 