const bcrypt = require('bcryptjs');
const mysql = require('mysql2');
require('dotenv').config();

const password = 'admin123'; // Admin şifresi
const email = 'product@example.com'; // Admin email'i
const address = 'Admin Office Address'; // Admin adresi

// Veritabanı bağlantısı
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '2001',
  database: 'online_store',
});

async function createAdmin() {
  try {
    // Şifreyi hash'le
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Admin kullanıcısını ekle
    const query = `
      INSERT INTO users (email, password, name, role, address) 
      VALUES (?, ?, 'Admin User', 'product_manager', ?)
    `;

    db.query(query, [email, hashedPassword, address], (err, result) => {
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