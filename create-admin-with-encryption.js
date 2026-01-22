const bcrypt = require('bcryptjs');
const mysql = require('mysql2');
const { encrypt } = require('./backend/utils/simpleEncryption');
require('dotenv').config();

const password = 'admin123'; // Admin password
const email = 'product@example.com'; // Admin email
const address = 'Admin Office Address'; // Admin address

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '2001',
  database: 'online_store',
});

async function createAdmin() {
  try {
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Encrypt user data
    const encryptedEmail = encrypt(email.trim().toLowerCase());
    const encryptedName = encrypt('Admin User');
    const encryptedAddress = encrypt(address);

    // Add admin user
    const query = `
      INSERT INTO users (email, password, name, role, address) 
      VALUES (?, ?, ?, 'product_manager', ?)
    `;

    db.query(query, [encryptedEmail, hashedPassword, encryptedName, encryptedAddress], (err, result) => {
      if (err) {
        console.error('Error creating admin:', err);
        process.exit(1);
      }
      console.log('Admin user created successfully!');
      console.log('Email:', email);
      console.log('Password:', password);
      process.exit(0);
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createAdmin(); 