const PDFDocument = require('pdfkit');
const fs = require('fs-extra');
const path = require('path');

const ensureInvoiceDir = async () => {
  const invoiceDir = path.join(__dirname, '../invoices');
  await fs.ensureDir(invoiceDir);
  return invoiceDir;
};

const colors = {
  primary: '#4F46E5', // Indigo
  secondary: '#6B7280', // Gray
  light: '#F3F4F6', // Light Gray
  border: '#E5E7EB', // Border Color
  text: '#1F2937', // Dark Gray
  success: '#10B981'
};

const drawRoundedRect = (doc, x, y, width, height, radius, fillColor) => {
  doc.roundedRect(x, y, width, height, radius).fill(fillColor);
};

const generateInvoice = async (order, user) => {
  const invoiceDir = await ensureInvoiceDir();
  const invoiceFilename = `invoice-${order.id}-${Date.now()}.pdf`;
  const invoicePath = path.join(invoiceDir, invoiceFilename);
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
        bufferPages: true,
        info: {
          Title: `Invoice #INV-${order.id}`,
          Author: 'TechStore E-Commerce',
          Producer: 'TechStore',
          CreationDate: new Date()
        },
        lang: 'en-US',
        displayTitle: true
      });
      
      const writeStream = fs.createWriteStream(invoicePath);
      
      writeStream.on('finish', () => resolve(invoicePath));
      writeStream.on('error', reject);
      
      doc.pipe(writeStream);
      
      doc.registerFont('Helvetica', 'Helvetica');
      doc.font('Helvetica');
      
      drawRoundedRect(doc, 50, 50, doc.page.width - 100, 130, 5, colors.primary);
      
      doc.fill('white');
      doc.fontSize(28).text('INVOICE', 70, 70);
      doc.fontSize(12);
      doc.text(`Invoice #: INV-${order.id}`, 70, 105);
      doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 70, 125);
      
      const orderStatus = order.status || 'processing';
      const statusWidth = 120;
      const statusX = doc.page.width - 70 - statusWidth;
      drawRoundedRect(doc, statusX, 70, statusWidth, 30, 15, 'white');
      doc.fill(colors.primary).fontSize(14)
         .text(orderStatus.toUpperCase(), statusX, 78, { 
           width: statusWidth, 
           align: 'center' 
         });
      
      doc.fill('white').fontSize(18)
         .text('TechStore', statusX, 125, { width: statusWidth, align: 'right' });
      
      doc.fill(colors.text);
      
      const topSectionY = 210;
      const columnWidth = (doc.page.width - 100) / 2;
      
      doc.fontSize(14).fillColor(colors.primary).text('FROM', 50, topSectionY);
      doc.fillColor(colors.text).fontSize(12).text('TechStore', 50, topSectionY + 25);
      doc.fillColor(colors.secondary).fontSize(10);
      doc.text('123 Commerce Street', 50, topSectionY + 45);
      doc.text('Istanbul, Turkey', 50, topSectionY + 60);
      doc.text('info@techstore.com', 50, topSectionY + 75);
      doc.text('+90 212 XXX XX XX', 50, topSectionY + 90);
      
      doc.fillColor(colors.primary).fontSize(14).text('SHIPPING ADDRESS', 50 + columnWidth, topSectionY);
      doc.fillColor(colors.text).fontSize(12).text(user.name, 50 + columnWidth, topSectionY + 25);
      doc.fillColor(colors.secondary).fontSize(10);
      doc.text(`Email: ${user.email}`, 50 + columnWidth, topSectionY + 45);
      
      const cleanAddress = order.delivery_address ? order.delivery_address.replace(/[^\x00-\x7F]/g, '') : 'Address not provided';
      
      if (user.tax_id) {
        doc.text(`Tax ID: ${user.tax_id}`, 50 + columnWidth, topSectionY + 60);
        doc.text(cleanAddress, 50 + columnWidth, topSectionY + 75, {
          width: columnWidth - 20,
          height: 100,
          ellipsis: false
        });
      } else {
        doc.text(cleanAddress, 50 + columnWidth, topSectionY + 60, {
          width: columnWidth - 20,
          height: 100,
          ellipsis: false
        });
      }
      
      const tableTop = topSectionY + 140;
      
      drawRoundedRect(doc, 50, tableTop, doc.page.width - 100, 30, 5, colors.light);
      
      doc.fillColor(colors.primary).fontSize(10);
      doc.text('ITEM', 70, tableTop + 10);
      doc.text('DESCRIPTION', 170, tableTop + 10);
      doc.text('QTY', 320, tableTop + 10);
      doc.text('PRICE', 380, tableTop + 10);
      doc.text('AMOUNT', 480, tableTop + 10);
      
      doc.fillColor(colors.text);
      
      let tableRow = tableTop + 40;
      let totalPrice = 0;
      
      if (order.items && order.items.length > 0) {
        order.items.forEach((item, i) => {
          // Convert price to number if it's a string
          const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
          const amount = price * item.quantity;
          totalPrice += amount;
          
          if (i % 2 === 0) {
            drawRoundedRect(doc, 50, tableRow - 10, doc.page.width - 100, 30, 0, colors.light);
          }
          
          const cleanProductName = item.product_name ? item.product_name.replace(/[^\x00-\x7F]/g, '') : 'Product';
          
          doc.fontSize(10).fillColor(colors.text);
          doc.text(`#${item.product_id}`, 70, tableRow);
          doc.text(cleanProductName, 170, tableRow, { width: 140, ellipsis: true });
          doc.text(item.quantity.toString(), 320, tableRow);
          doc.text(`$${price.toFixed(2)}`, 380, tableRow);
          doc.text(`$${amount.toFixed(2)}`, 480, tableRow);
          
          tableRow += 30;
        });
      }
      
      doc.strokeColor(colors.border).lineWidth(1)
         .moveTo(50, tableRow).lineTo(doc.page.width - 50, tableRow).stroke();
      
      tableRow += 20;
      
      const totalAmount = typeof order.total_amount === 'string' ? parseFloat(order.total_amount) : order.total_amount;
      
      doc.fontSize(10).fillColor(colors.secondary).text('Subtotal:', 380, tableRow);
      doc.fillColor(colors.text).text(`$${totalAmount.toFixed(2)}`, 480, tableRow);
      
      tableRow += 20;
      drawRoundedRect(doc, 350, tableRow - 5, doc.page.width - 350 - 50, 30, 5, colors.primary);
      doc.fillColor('white').text('TOTAL:', 380, tableRow);
      doc.text(`$${totalAmount.toFixed(2)}`, 480, tableRow);
      
      tableRow += 60;
      doc.fillColor(colors.primary).fontSize(14)
         .text('Thank you for your business!', 50, tableRow, { align: 'center' });
      
      tableRow += 30;
      doc.fillColor(colors.text).fontSize(10)
         .text('Payment Information', 50, tableRow, { align: 'center', underline: true });
      
      tableRow += 20;
      doc.fillColor(colors.secondary).fontSize(9)
         .text('Please make payment within 15 days from the date of invoice.', 50, tableRow, { align: 'center' });
      
      const footerY = doc.page.height - 50;
      doc.fillColor(colors.secondary).fontSize(8)
         .text('© 2025 TechStore. All rights reserved.', 50, footerY, { align: 'center' });
      
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fillColor(colors.secondary).fontSize(8)
           .text(`Page ${i + 1} of ${pages.count}`, 50, doc.page.height - 30, { align: 'center' });
      }
      
      doc.end();
    } catch (error) {
      console.error('Error generating PDF document:', error);
      reject(error);
    }
  });
};

const getOrGenerateInvoice = async (order, user) => {
  const invoiceDir = await ensureInvoiceDir();
  const invoicePattern = new RegExp(`invoice-${order.id}-\\d+\\.pdf`);
  
  const files = await fs.readdir(invoiceDir);
  const existingInvoice = files.find(file => invoicePattern.test(file));
  
  if (existingInvoice) {
    return path.join(invoiceDir, existingInvoice);
  }
  
  return generateInvoice(order, user);
};

module.exports = {
  generateInvoice,
  getOrGenerateInvoice
}; 