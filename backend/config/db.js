const mysql = require("mysql2");
require("dotenv").config();

console.log('Database connection config:', {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME
});

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("❌ MySQL Connection Error: " + err.message);
    console.error("Error code:", err.code);
    return;
  }
  console.log("✅ Successfully connected to MySQL!");
});

module.exports = db;
