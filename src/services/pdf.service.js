const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');

const generatePDF = async (generateContent) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 }); // Standard A4 size
      const buffers = [];

      // Collect chunks of data as the PDF is generated
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Handle any errors during PDF generation
      doc.on('error', (err) => {
        reject(new Error(`Error generating PDF: ${err.message}`));
      });

      // Call the content generation function
      generateContent(doc);

      // Finalize the PDF document
      doc.end();
    } catch (err) {
      reject(new Error(`Error initializing PDF generation: ${err.message}`));
    }
  });
};

/**
 * Generate PDF Header
 */
const generatePDFHeader = (doc, entity, title) => {
  const tenant = entity.tenantId;
  if (!tenant) return;

  const startX = 50;
  let y = 50;

  // Business Logo
  if (tenant.businessLogo) {
    const logoPath = path.resolve(__dirname, '..', tenant.businessLogo);
    try {
      doc.image(logoPath, startX, y, { height: 40, align: 'center', valign: 'center' });
    } catch (error) {
      logger.error('Error loading logo:', error.message);
    }
  }

  // Business Name & Address

  doc.fontSize(14).text(tenant.businessName, startX + 60, y, { bold: true });
  y += 15;
  // Check if businessBillingAddress exists and has valid fields
  if (tenant.businessBillingAddress) {
    const { addressLine, city, province, zipCode, country } = tenant.businessBillingAddress;
    let addressParts = [];

    if (addressLine?.trim()) {
      doc.fontSize(10).text(addressLine);
      y += 15;
    }

    if (city?.trim()) addressParts.push(city);
    if (province?.trim()) addressParts.push(province);
    if (zipCode?.trim()) addressParts.push(zipCode);
    //if (country?.trim()) addressParts.push(country);

    if (addressParts.length > 0) {
      doc.fontSize(10).text(addressParts.join(', '), startX + 60, y);
      y += 15;
    }
  }

  // Title (Aligned Right)
  doc.fontSize(20).text(title, 400, 50, { align: 'right', bold: true });

  // Draw separator line
  doc
    .moveTo(startX, y + 10)
    .lineTo(550, y + 10)
    .stroke();
  doc.moveDown(2);
};

/**
 * Generate Footer (Manually on each page)
 */
const generatePDFFooter = (doc, entity) => {
  const tenant = entity.tenantId;
  if (!tenant) return;

  const pageHeight = doc.page.height;
  const footerY = pageHeight - 70; // Fixed position from the bottom

  // Separator line
  doc
    .moveTo(50, footerY - 10)
    .lineTo(550, footerY - 10)
    .stroke();

  // Footer Text
  /*   const pageWidth = doc.page.width;

  const margin = 50; */
  //const columnWidth = (pageWidth - 2 * margin) / 3;

  doc.fontSize(10);
  doc.text(tenant.businessPhone || tenant.businessEmail || '', 50, footerY, {
    /* width: columnWidth, */ align: 'left' /* continued: true */,
  });
  doc.text(tenant.businessWebsite || '', 400, footerY, {
    /*  width: columnWidth, */
    align: 'right',
    /* continued: true, */
  });
  // doc.text(tenant.businessEmail || '', margin + 2 * 60, footerY, { width: columnWidth, align: 'right' });
};

/**
 * Generate Purchase Order PDF
 */
const generatePurchaseOrderPDF = async (purchaseOrder) => {
  return generatePDF((doc) => {
    const currency = purchaseOrder.tenantId.currency;

    generatePDFHeader(doc, purchaseOrder, 'Purchase Order');

    let headYpos = doc.y;
    doc.fontSize(12).text(`Order ID:`, 400, headYpos, {
      align: 'left',
    });
    doc.fontSize(12).text(`PO-${purchaseOrder.purchaseOrderNumber}`, 460, headYpos, {
      align: 'left',
    });
    const formattedDate = purchaseOrder.createdAt.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
    doc.text(`Date:`, 400, headYpos + 20, { align: 'left' });
    doc.text(`${formattedDate}`, 460, headYpos + 20, { align: 'left' });

    doc.moveDown(2);

    let linePos = doc.y;
    const xPos = 300;
    doc.fontSize(12).text('VENDOR INFO', 50, linePos, { bold: true, align: 'left', underline: true });
    doc.fontSize(12).text('SHIP TO', xPos, linePos, { bold: true, align: 'left', underline: true });
    doc.moveDown(0.5);
    linePos = doc.y;
    doc.fontSize(10).text(`${purchaseOrder.vendor.companyName}`, 50, linePos, { bold: true, align: 'left' });
    doc.fontSize(10).text(`${purchaseOrder.tenantId.businessName}`, xPos, linePos, { bold: true, align: 'left' });

    linePos = doc.y;
    doc.fontSize(10).text(`${purchaseOrder.vendor.address.AddressLine || ''}`, 50, linePos, { bold: true, align: 'left' });
    doc.fontSize(10).text(`${purchaseOrder.tenantId.businessBillingAddress.addressLine || ''}`, xPos, linePos, {
      bold: true,
      align: 'left',
    });

    linePos = doc.y;
    doc
      .fontSize(10)
      .text(
        `${purchaseOrder.vendor.address.City || ''}, ${purchaseOrder.vendor.address.Province || ''}, ${
          purchaseOrder.vendor.address.zipcode || ''
        }`,
        50,
        linePos,
        {
          bold: true,
          align: 'left',
        }
      );
    doc
      .fontSize(10)
      .text(
        `${purchaseOrder.tenantId.businessBillingAddress.city || ''}, ${
          purchaseOrder.tenantId.businessBillingAddress.province || ''
        }, ${purchaseOrder.tenantId.businessBillingAddress.zipCode || ''}`,
        xPos,
        linePos,
        { bold: true, align: 'left' }
      );

    doc.moveDown(2);
    doc.fontSize(12).text('ITEMS', 50, doc.y, { bold: true, align: 'left', underline: true });
    doc.moveDown(0.5);

    // Table Configuration
    const tableTop = doc.y + 10;
    const pageHeight = doc.page.height;
    const footerMargin = 80;
    let yPos = tableTop + 25;

    // Table Header
    doc.font('Helvetica-Bold').fontSize(12).text('No.', 50, tableTop, { bold: true });
    doc.text('Item Name', 100, tableTop, { bold: true });
    doc.text('Qty', 300, tableTop, { bold: true });
    doc.text('Unit Price', 380, tableTop, { bold: true });
    doc.text('Total', 460, tableTop, { bold: true });

    doc
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    // Table Rows with Manual Page Breaks
    purchaseOrder.items.forEach((item, index) => {
      if (yPos + 20 > pageHeight - footerMargin) {
        generatePDFFooter(doc, purchaseOrder); // Add footer before new page
        doc.addPage();
        generatePDFHeader(doc, purchaseOrder, 'Purchase Order');
        yPos = doc.y + 10;
      }

      doc.font('Helvetica').text(`${index + 1}`, 50, yPos);
      doc.text(item.itemName, 100, yPos);
      doc.text(item.quantity.toString(), 300, yPos);
      doc.text(`${currency}${item.price.toFixed(2)}`, 380, yPos);
      doc.text(`${currency}${(item.quantity * item.price).toFixed(2)}`, 460, yPos);
      yPos += 20;
    });

    // Draw Total Row
    if (yPos + 30 > pageHeight - footerMargin) {
      generatePDFFooter(doc, purchaseOrder);
      doc.addPage();
      generatePDFHeader(doc, purchaseOrder, 'Purchase Order');
      yPos = doc.y + 10;
    }

    doc
      .moveTo(50, yPos + 5)
      .lineTo(550, yPos + 5)
      .stroke();

    doc.moveDown(4);
    yPos = doc.y;
    /*  doc.fontSize(12).text(`Sub Total`, 400, yPos + 20);
    doc.fontSize(12).text(`Discount`, 400, yPos + 40);
    doc.fontSize(12).text(`Tax`, 400, yPos + 60); */
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(`Total`, 400, yPos + 40);
    doc.font('Helvetica');
    doc.fontSize(12).text(`(excluding Taxes)`, 400, yPos + 60);

    /*  doc.fontSize(12).text(`${currency}${purchaseOrder.total.toFixed(2)}`, 460, yPos + 20);
    doc.fontSize(12).text(`${currency}${purchaseOrder.total.toFixed(2)}`, 460, yPos + 40);
    doc.fontSize(12).text(`${currency}${purchaseOrder.total.toFixed(2)}`, 460, yPos + 60); */
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(`${currency}${purchaseOrder.total.toFixed(2)}`, 460, yPos + 40);

    doc.fontSize(8).text(`Comments or Instructions`, 50, yPos + 20);
    doc.rect(50, yPos + 30, 300, 60);
    // Add the text inside the rectangle
    doc.fontSize(8).text(purchaseOrder.comment, 50 + 5, yPos + 30 + 5, {
      width: 300 - 10, // Ensuring the text does not overflow the rectangle's width
      align: 'left', // Align the text to the left inside the rectangle
      lineBreak: true, // Allow wrapping of text if necessary
    });

    doc.font('Helvetica');
    // Final footer
    generatePDFFooter(doc, purchaseOrder);
  });
};

/**
 * Generate an Invoice PDF
 * @param {Object} invoice - The invoice data
 * @param {string} outputPath - The path to save the PDF
 * @returns {Promise<string>}
 */
const generateInvoicePDF = async (invoice, outputPath) => {
  return generatePDF((doc) => {
    doc.fontSize(18).text('Invoice', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Invoice ID: ${invoice.id}`);
    doc.text(`Date: ${invoice.date}`);
    doc.text(`Customer: ${invoice.customer.name}`);
    doc.text(`Due Date: ${invoice.dueDate}`);
    doc.moveDown();

    doc.text('Items:');
    invoice.items.forEach((item, index) => {
      doc.text(
        `${index + 1}. ${item.name} - ${item.quantity} x $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(
          2
        )}`
      );
    });

    doc.moveDown();
    doc.text(`Total: $${invoice.total.toFixed(2)}`, { align: 'right' });
  });
};

/**
 * Generate an Estimate PDF
 * @param {Object} estimate - The estimate data
 * @param {string} outputPath - The path to save the PDF
 * @returns {Promise<string>}
 */
const generateEstimatePDF = async (estimate, outputPath) => {
  return generatePDF((doc) => {
    doc.fontSize(18).text('Estimate', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Estimate ID: ${estimate.id}`);
    doc.text(`Date: ${estimate.date}`);
    doc.text(`Customer: ${estimate.customer.name}`);
    doc.moveDown();

    doc.text('Items:');
    estimate.items.forEach((item, index) => {
      doc.text(
        `${index + 1}. ${item.name} - ${item.quantity} x $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(
          2
        )}`
      );
    });

    doc.moveDown();
    doc.text(`Total: $${estimate.total.toFixed(2)}`, { align: 'right' });
  });
};

/**
 * Generate a Job Order PDF
 * @param {Object} jobOrder - The job order data
 * @param {string} outputPath - The path to save the PDF
 * @returns {Promise<string>}
 */
const generateJobOrderPDF = async (jobOrder, outputPath) => {
  return generatePDF((doc) => {
    doc.fontSize(18).text('Job Order', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Job Order ID: ${jobOrder.id}`);
    doc.text(`Date: ${jobOrder.date}`);
    doc.text(`Assigned To: ${jobOrder.assignedTo}`);
    doc.text(`Description: ${jobOrder.description}`);
    doc.moveDown();

    doc.text('Tasks:');
    jobOrder.tasks.forEach((task, index) => {
      doc.text(`${index + 1}. ${task.description}`);
    });

    doc.moveDown();
    doc.text(`Total Cost: $${jobOrder.totalCost.toFixed(2)}`, { align: 'right' });
  });
};

module.exports = {
  generatePurchaseOrderPDF,
  generateInvoicePDF,
  generateEstimatePDF,
  generateJobOrderPDF,
};
