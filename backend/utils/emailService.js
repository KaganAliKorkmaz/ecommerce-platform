const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { createTestEmailTransporter } = require('./testEmailService');
const { decrypt } = require('./simpleEncryption');

function safelyDecryptEmail(email) {
  if (!email) return null;
  
  try {
    if (/^[a-f0-9]+$/i.test(email)) {
      return decrypt(email);
    }
    return email;
  } catch (error) {
    console.error('Error decrypting email:', error);
    return email;
  }
}

const USE_TEST_EMAIL = process.env.USE_TEST_EMAIL === 'true' || process.env.EMAIL_PASSWORD === 'your_app_password';

const createTransporter = async () => {
  if (USE_TEST_EMAIL) {
    console.log('Using test email service (Ethereal) instead of real email');
    try {
      const { transporter, account } = await createTestEmailTransporter();
      console.log(`Test email account: ${account.user}`);
      return { transporter, isTestAccount: true, testAccount: account };
    } catch (error) {
      console.error('Failed to create test email account:', error);
      console.error('Falling back to configured email settings');
    }
  }
  
  const config = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  };
  
  console.log(`Email Configuration: HOST=${config.host}, PORT=${config.port}, SECURE=${config.secure}, USER=${config.auth.user}`);
  
  if (!config.auth.user || !config.auth.pass || config.auth.pass === 'your_app_password') {
    console.error('CRITICAL EMAIL CONFIG ERROR: Email credentials not properly configured in .env file');
    console.error('For Gmail, you need to set up an App Password. See README.md for instructions.');
  }
  
  return { transporter: nodemailer.createTransport(config), isTestAccount: false };
};

const sendInvoiceEmail = async (options) => {
  try {
    const recipientEmail = safelyDecryptEmail(options.to);
    
    if (!recipientEmail) {
      throw new Error('Recipient email address is missing');
    }
    
    const { transporter, isTestAccount, testAccount } = await createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || (isTestAccount ? `E-Commerce Store <${testAccount.user}>` : '"E-Commerce Store" <store@example.com>'),
      to: recipientEmail,
      subject: options.subject || 'Your Invoice',
      text: options.text || 'Please find your invoice attached.',
      html: options.html || '<p>Please find your invoice attached.</p>'
    };
    
    if (options.invoicePath) {
      const filename = path.basename(options.invoicePath);
      
      if (!fs.existsSync(options.invoicePath)) {
        console.error(`Invoice file not found at path: ${options.invoicePath}`);
        throw new Error(`Invoice file not found: ${options.invoicePath}`);
      }
      
      mailOptions.attachments = [
        {
          filename,
          path: options.invoicePath,
          contentType: 'application/pdf'
        }
      ];
    } else {
      console.warn('No invoice path provided for attachment');
    }
    
    // Send email
    console.log('Attempting to send email now...');
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    
    // For test accounts, get the message URL
    if (isTestAccount) {
      const messageUrl = nodemailer.getTestMessageUrl(info);
      console.log('=======================================');
      console.log('TEST EMAIL PREVIEW URL:', messageUrl);
      console.log('Open this URL to view the test email');
      console.log('=======================================');
      info.messageUrl = messageUrl;
    }
    
    return info;
  } catch (error) {
    console.error('ERROR DETAILS for sending email:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.code === 'EAUTH') {
      console.error('Authentication error: Check your email username and password in .env file');
      console.error('For Gmail, you need to generate an App Password. Add USE_TEST_EMAIL=true to use a test email service instead.');
    } else if (error.code === 'ESOCKET') {
      console.error('Socket error: Check your email host and port settings');
    } else if (error.code === 'ECONNECTION') {
      console.error('Connection error: Could not connect to email server');
    }
    
    throw error;
  }
};

async function sendOrderInTransitEmail(email, name, order) {
  const recipientEmail = safelyDecryptEmail(email);
  
  const subject = `Order #${order.id} Update: Your Order is On Its Way!`;
  
  const html = `
    <h2>Hello ${name},</h2>
    <p>Great news! Your order #${order.id} has been shipped and is now on its way to you.</p>
    <p>Here's a summary of your order:</p>
    <ul>
      <li><strong>Order ID:</strong> #${order.id}</li>
      <li><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</li>
      <li><strong>Status:</strong> In Transit</li>
      <li><strong>Delivery Address:</strong> ${order.delivery_address}</li>
    </ul>
    <p>You will receive another notification when your order has been delivered.</p>
    <p>Thank you for shopping with us!</p>
    <p>Best regards,<br>Your Online Store Team</p>
  `;

  try {
    const { transporter, isTestAccount, testAccount } = await createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || (isTestAccount ? `E-Commerce Store <${testAccount.user}>` : '"E-Commerce Store" <store@example.com>'),
      to: recipientEmail,
      subject,
      html
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('In-transit email sent successfully:', info.messageId);
    
    if (isTestAccount) {
      const messageUrl = nodemailer.getTestMessageUrl(info);
      console.log('TEST EMAIL PREVIEW URL:', messageUrl);
      info.messageUrl = messageUrl;
    }
    
    return info;
  } catch (error) {
    console.error('Error sending in-transit email:', error);
    throw error;
  }
}

async function sendOrderDeliveredEmail(email, name, order) {
  
  const subject = `Order #${order.id} Update: Your Order Has Been Delivered!`;
  
  const html = `
    <h2>Hello ${name},</h2>
    <p>Your order #${order.id} has been delivered!</p>
    <p>Here's a summary of your order:</p>
    <ul>
      <li><strong>Order ID:</strong> #${order.id}</li>
      <li><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</li>
      <li><strong>Status:</strong> Delivered</li>
      <li><strong>Delivery Address:</strong> ${order.delivery_address}</li>
    </ul>
    <p>We hope you enjoy your purchase. If you have any questions or concerns about your order, please don't hesitate to contact us.</p>
    <p>Thank you for shopping with us!</p>
    <p>Best regards,<br>Your Online Store Team</p>
  `;

  try {
    const { transporter, isTestAccount, testAccount } = await createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || (isTestAccount ? `E-Commerce Store <${testAccount.user}>` : '"E-Commerce Store" <store@example.com>'),
      to: email,
      subject,
      html
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Delivery email sent successfully:', info.messageId);
    
    if (isTestAccount) {
      const messageUrl = nodemailer.getTestMessageUrl(info);
      console.log('TEST EMAIL PREVIEW URL:', messageUrl);
      info.messageUrl = messageUrl;
    }
    
    return info;
  } catch (error) {
    console.error('Error sending delivery email:', error);
    throw error;
  }
}

async function sendOrderCancelledEmail(email, name, order) {
  
  const subject = `Order #${order.id} Has Been Cancelled`;
  
  const html = `
    <h2>Hello ${name},</h2>
    <p>Your order #${order.id} has been cancelled as requested.</p>
    <p>Here's a summary of your cancelled order:</p>
    <ul>
      <li><strong>Order ID:</strong> #${order.id}</li>
      <li><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</li>
      <li><strong>Status:</strong> Cancelled</li>
    </ul>
    <p>If you have any questions about your cancellation or would like to place a new order, please don't hesitate to contact us.</p>
    <p>Thank you for your understanding.</p>
    <p>Best regards,<br>Your Online Store Team</p>
  `;

  try {
    const { transporter, isTestAccount, testAccount } = await createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || (isTestAccount ? `E-Commerce Store <${testAccount.user}>` : '"E-Commerce Store" <store@example.com>'),
      to: email,
      subject,
      html
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Cancellation email sent successfully:', info.messageId);
    
    if (isTestAccount) {
      const messageUrl = nodemailer.getTestMessageUrl(info);
      console.log('TEST EMAIL PREVIEW URL:', messageUrl);
      info.messageUrl = messageUrl;
    }
    
    return info;
  } catch (error) {
    console.error('Error sending cancellation email:', error);
    throw error;
  }
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

async function sendDiscountNotification(email, name, productName, discountType, discountValue) {
  const subject = 'New Discount Available!';
  const discountText = discountType === 'percentage' 
    ? `${discountValue}% off` 
    : `$${discountValue} off`;
  
  const html = `
    <h2>Hello ${name},</h2>
    <p>Great news! A new discount is available for a product in your wishlist.</p>
    <p><strong>Product:</strong> ${productName}</p>
    <p><strong>Discount:</strong> ${discountText}</p>
    <p>Hurry up and check it out before the offer ends!</p>
    <p>Best regards,<br>Your Online Store Team</p>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject,
      html
    });
    console.log(`Discount notification sent to ${email}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

async function sendPriceApprovalNotification(email, name, productName, price) {
  const subject = 'Product Price Approved';
  const html = `
    <h2>Hello ${name},</h2>
    <p>The price for a product in your wishlist has been approved.</p>
    <p><strong>Product:</strong> ${productName}</p>
    <p><strong>Price:</strong> $${price}</p>
    <p>You can now purchase this product!</p>
    <p>Best regards,<br>Your Online Store Team</p>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject,
      html
    });
    console.log(`Price approval notification sent to ${email}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

async function sendOrderStatusEmail(options) {
  try {
    const { to, name, orderId, status, orderDetails, additionalInfo } = options;
    const recipientEmail = safelyDecryptEmail(to);
    
    let subject = `Order #${orderId} Update`;
    let statusMessage = '';
    let actionSection = '';
    
    switch (status) {
      case 'in-transit':
        subject = `Your Order #${orderId} is on the way!`;
        statusMessage = 'Your order is now in transit.';
        actionSection = `
          <p>Your package is on its way to you! Expect delivery within 3-5 business days.</p>
          <p>You will receive another notification when your order is delivered.</p>
        `;
        break;
        
      case 'delivered':
        subject = `Your Order #${orderId} has been delivered!`;
        statusMessage = 'Your order has been delivered.';
        actionSection = `
          <p>Your package has been delivered to your address.</p>
          <p>If you have any issues with your order, you can request a refund within 30 days.</p>
        `;
        break;
        
      case 'cancelled':
        subject = `Your Order #${orderId} has been cancelled`;
        statusMessage = 'Your order has been cancelled.';
        actionSection = `
          <p>Your order has been successfully cancelled as requested.</p>
          <p>Any payment made for this order will be refunded to your original payment method within 5-7 business days.</p>
          ${additionalInfo ? `<p>Cancellation reason: ${additionalInfo}</p>` : ''}
          <p>Thank you for your understanding.</p>
        `;
        break;
        
      case 'refund-requested':
        subject = `Refund Request Received for Order #${orderId}`;
        statusMessage = 'Your refund request has been received.';
        actionSection = `
          <p>We have received your refund request for Order #${orderId}.</p>
          <p>Our team will review your request and you will be notified when a decision has been made.</p>
          <p>Reason for refund: ${additionalInfo || 'Not specified'}</p>
        `;
        break;
        
      case 'refund-approved':
        subject = `Refund Approved for Order #${orderId}`;
        statusMessage = 'Your refund has been approved.';
        actionSection = `
          <p>Good news! Your refund request for Order #${orderId} has been approved.</p>
          <p>The refund amount will be processed to your original payment method within 5-7 business days.</p>
          ${additionalInfo ? `<p>Admin note: ${additionalInfo}</p>` : ''}
        `;
        break;
        
      case 'refund-denied':
        subject = `Refund Request Denied for Order #${orderId}`;
        statusMessage = 'Your refund request has been denied.';
        actionSection = `
          <p>We're sorry, but your refund request for Order #${orderId} has been denied.</p>
          ${additionalInfo ? `<p>Reason: ${additionalInfo}</p>` : ''}
          <p>If you have any questions, please contact our customer support team.</p>
        `;
        break;
        
      default:
        statusMessage = `Your order status has been updated to: ${status}`;
        actionSection = `<p>Thank you for shopping with us!</p>`;
    }
    
    let orderItemsHtml = '';
    if (orderDetails && orderDetails.items && orderDetails.items.length > 0) {
      orderItemsHtml = `
        <h3>Order Items</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background-color: #f2f2f2;">
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Product</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Quantity</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Price</th>
          </tr>
          ${orderDetails.items.map(item => `
            <tr>
              <td style="padding: 10px; text-align: left; border: 1px solid #ddd;">${item.product_name || 'Product'}</td>
              <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${item.quantity}</td>
              <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">$${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr style="font-weight: bold;">
            <td colspan="2" style="padding: 10px; text-align: right; border: 1px solid #ddd;">Total:</td>
            <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">$${orderDetails.total_amount ? parseFloat(orderDetails.total_amount).toFixed(2) : '0.00'}</td>
          </tr>
        </table>
      `;
    }
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333;">Order Status Update</h1>
        </div>
        
        <div style="padding: 20px;">
          <h2>Hello ${name || 'Valued Customer'},</h2>
          
          <p style="font-size: 18px; margin-bottom: 20px;"><strong>${statusMessage}</strong></p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <p><strong>Order ID:</strong> #${orderId}</p>
            <p><strong>Status:</strong> ${status}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          ${orderItemsHtml}
          
          <div style="background-color: #f0f7ff; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            ${actionSection}
          </div>
          
          <p>Thank you for shopping with our store!</p>
          <p>If you have any questions, please contact our customer support.</p>
          
          <div style="padding-top: 20px; border-top: 1px solid #eee; margin-top: 20px; color: #777; font-size: 12px;">
            <p>This is an automated email, please do not reply to this message.</p>
          </div>
        </div>
      </div>
    `;
    
    const { transporter, isTestAccount, testAccount } = await createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || (isTestAccount ? `E-Commerce Store <${testAccount.user}>` : '"E-Commerce Store" <store@example.com>'),
      to: recipientEmail,
      subject,
      html
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    if (isTestAccount) {
      const messageUrl = nodemailer.getTestMessageUrl(info);
      console.log('TEST EMAIL PREVIEW URL:', messageUrl);
      info.messageUrl = messageUrl;
    }
    
    return info;
  } catch (error) {
    console.error('Error sending order status email:', error);
    throw error;
  }
}

module.exports = {
  sendInvoiceEmail,
  sendDiscountNotification,
  sendPriceApprovalNotification,
  sendOrderInTransitEmail,
  sendOrderDeliveredEmail,
  sendOrderCancelledEmail,
  sendOrderStatusEmail
}; 