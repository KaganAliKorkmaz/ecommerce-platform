const nodemailer = require('nodemailer');

/**
 * Creates a test email account using Ethereal
 * @returns {Promise<Object>} Test account credentials
 */
const createTestAccount = async () => {
  console.log('Creating test email account through Ethereal...');
  try {
    const testAccount = await nodemailer.createTestAccount();
    
    console.log('Test email account created successfully!');
    console.log('========================================');
    console.log('EMAIL_HOST=smtp.ethereal.email');
    console.log(`EMAIL_PORT=587`);
    console.log(`EMAIL_SECURE=false`);
    console.log(`EMAIL_USER=${testAccount.user}`);
    console.log(`EMAIL_PASSWORD=${testAccount.pass}`);
    console.log(`EMAIL_FROM="E-Commerce Store <${testAccount.user}>"`);
    console.log('========================================');
    console.log('Copy these values to your .env file to use test emails');
    
    return testAccount;
  } catch (error) {
    console.error('Error creating test email account:', error);
    throw error;
  }
};

/**
 * Creates a test email transporter
 * @returns {Promise<Object>} Transporter and account info
 */
const createTestEmailTransporter = async () => {
  const testAccount = await createTestAccount();
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
  
  return {
    transporter,
    account: testAccount
  };
};

module.exports = {
  createTestAccount,
  createTestEmailTransporter
}; 