const crypto = require('crypto');
require('dotenv').config();

const ENCRYPTION_KEY = Buffer.from(
  process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').substring(0, 32).padEnd(32, '0')
);
const IV = Buffer.from(
  process.env.ENCRYPTION_IV || crypto.randomBytes(16).toString('hex').substring(0, 16).padEnd(16, '0')
);

if (!process.env.ENCRYPTION_KEY || !process.env.ENCRYPTION_IV) {
  console.warn('WARNING: ENCRYPTION_KEY and ENCRYPTION_IV should be set in environment variables for production!');
}

function encrypt(text) {
  if (!text) return null;
  try {
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

function decrypt(encrypted) {
  if (!encrypted) return null;
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

module.exports = { encrypt, decrypt }; 