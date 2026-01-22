const bcrypt = require('bcryptjs');
const mysql = require('mysql2');

const password = 'sales123'; // Sales manager şifresi
const email = 'sale@example.com'; // Sales manager email'i
const address = 'Sales Office Address'; // Sales manager adresi

// Veritabanı bağlantısı
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '2001',
  database: 'online_store',
});

async function createSalesManager() {
  try {
    // Şifreyi hash'le
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Sales manager kullanıcısını ekle
    const query = `
      INSERT INTO users (email, password, name, role, address) 
      VALUES (?, ?, 'Sales Manager', 'sales_manager', ?)
    `;

    db.query(query, [email, hashedPassword, address], (err, result) => {
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