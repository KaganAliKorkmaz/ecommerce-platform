const crypto = require('crypto');

// 32 karakterlik sabit key ve 16 karakterlik sabit IV (güvenlik için değil, basitlik için!)
const ENCRYPTION_KEY = Buffer.from('12345678901234567890123456789012'); // 32 byte
const IV = Buffer.from('1234567890123456'); // 16 byte

function encrypt(text) {
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decrypt(encrypted) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encrypt, decrypt }; 