const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const verifyToken = require("../middleware/auth");
const { encrypt, decrypt } = require('../utils/simpleEncryption');
const { validateRegister, validateLogin, validateProfileUpdate } = require('../middleware/validation');

router.post("/register", validateRegister, async (req, res) => {
  let { name, email, password, address, tax_id } = req.body;

  try {
    const encryptedEmail = encrypt(email.trim().toLowerCase());
    const encryptedName = encrypt(name);
    const encryptedAddress = encrypt(address);
    const encryptedTaxId = tax_id ? encrypt(tax_id) : null;

    const [existingUsers] = await db.promise().query(
      "SELECT * FROM users WHERE email = ?",
      [encryptedEmail]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: "This email address is already in use" });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await db.promise().query(
      "INSERT INTO users (name, email, password, address, tax_id) VALUES (?, ?, ?, ?, ?)",
      [encryptedName, encryptedEmail, hashedPassword, encryptedAddress, encryptedTaxId]
    );
    
    res.json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", validateLogin, async (req, res) => {
  let { email, password } = req.body;

  try {
    const encryptedEmail = encrypt(email.trim().toLowerCase());
    const [users] = await db.promise().query(
      "SELECT * FROM users WHERE email = ?",
      [encryptedEmail]
    );
    
    if (users.length === 0) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const decryptedName = decrypt(user.name);
    const decryptedEmail = decrypt(user.email);
    const decryptedAddress = decrypt(user.address);
    const decryptedTaxId = user.tax_id ? decrypt(user.tax_id) : null;

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({ error: "Server configuration error" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ 
      message: "Login successful", 
      token,
      user: {
        id: user.id,
        name: decryptedName,
        email: decryptedEmail,
        address: decryptedAddress,
        tax_id: decryptedTaxId,
        role: user.role
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put('/profile', verifyToken, validateProfileUpdate, async (req, res) => {
  try {
    const { name, email, address, tax_id, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const [users] = await db.promise().query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    if (newPassword) {
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.promise().query(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, userId]
      );
    }

    const encryptedEmail = encrypt(email.trim().toLowerCase());
    
    const [existingUsers] = await db.promise().query(
      'SELECT * FROM users WHERE email = ? AND id != ?',
      [encryptedEmail, userId]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email address is already in use by another account' });
    }

    const encryptedName = encrypt(name);
    const encryptedAddress = encrypt(address);
    const encryptedTaxId = tax_id ? encrypt(tax_id) : null;

    await db.promise().query(
      'UPDATE users SET name = ?, email = ?, address = ?, tax_id = ? WHERE id = ?',
      [encryptedName, encryptedEmail, encryptedAddress, encryptedTaxId, userId]
    );

    const [updatedUsers] = await db.promise().query(
      'SELECT id, name, email, address, tax_id, role FROM users WHERE id = ?', 
      [userId]
    );
    const updatedUser = updatedUsers[0];

    const decryptedUser = {
      id: updatedUser.id,
      name: decrypt(updatedUser.name),
      email: decrypt(updatedUser.email),
      address: decrypt(updatedUser.address),
      tax_id: updatedUser.tax_id ? decrypt(updatedUser.tax_id) : null,
      role: updatedUser.role
    };

    res.json({ 
      message: 'Profile updated successfully',
      user: decryptedUser
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.post("/admin/register", async (req, res) => {
  const { name, email, password, address, tax_id, adminKey } = req.body;

  const requiredAdminKey = process.env.ADMIN_SECRET_KEY;
  if (!requiredAdminKey) {
    console.error('ADMIN_SECRET_KEY is not set in environment variables');
    return res.status(500).json({ error: "Server configuration error" });
  }

  if (adminKey !== requiredAdminKey) {
    return res.status(403).json({ error: "Invalid admin key" });
  }

  if (!name || !email || !password || !address) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long" });
  }

  try {
    const encryptedEmail = encrypt(email.trim().toLowerCase());
    const encryptedName = encrypt(name);
    const encryptedAddress = encrypt(address);
    const encryptedTaxId = tax_id ? encrypt(tax_id) : null;

    const [existingUsers] = await db.promise().query(
      "SELECT * FROM users WHERE email = ?", 
      [encryptedEmail]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: "This email is already in use" });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await db.promise().query(
      "INSERT INTO users (name, email, password, address, tax_id, role) VALUES (?, ?, ?, ?, ?, ?)", 
      [encryptedName, encryptedEmail, hashedPassword, encryptedAddress, encryptedTaxId, "product_manager"]
    );
    
    res.json({ message: "Admin user successfully registered" });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

module.exports = router;
