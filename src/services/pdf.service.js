const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');

/**
 * Generate a PDF
 * @param {function} generateContent - Function that generates content for the PDF
 * @returns {Promise<string>} - Returns the path of the generated PDF
 */
/**
 * Generate a PDF in-memory
 * @param {Function} generateContent - A function to generate the content of the PDF, receiving the PDFDocument instance as an argument
 * @returns {Promise<Buffer>} - A Promise that resolves with the generated PDF as a Buffer
 */
const generatePDF = async (generateContent) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
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
 * Generate a standard PDF header using tenant information
 * @param {Object} doc - PDF document instance
 * @param {Object} entity - The entity data (purchase order, invoice, etc.)
 * @param {string} title - The document title (e.g., "Purchase Order", "Invoice")
 */
const generatePDFHeader = (doc, entity, title) => {
  // Business Details
  const tenant = entity.tenantId;
  // Save current position
  const startX = doc.x;
  const startY = doc.y - 10;

  /* doc.fontSize(24).text(title, { align: 'center' });
  doc.moveDown(); */

  if (tenant) {
    // Convert relative businessLogo path to an absolute path

    const logoPath = path.resolve(__dirname, '..', tenant.businessLogo);

    // Place logo on the left
    try {
      // Fit the image in the dimensions, and center it both horizontally and vertically
      doc.image(logoPath, startX, startY, { fit: [50, 50], align: 'center', valign: 'center' });

      //doc.image(logoPath, startX, startY, { width: 60, height: 60 });
    } catch (error) {
      console.error('Error loading logo:', error.message);
    }

    // Move to the right for title, keeping it justified between
    doc.x = startX + 100; // Adjust spacing as needed
    doc.fontSize(24).text(title, { align: 'right' });
    // doc.image(logoPath, { width: 60, height: 60 }).moveDown();

    // Reset x position for next content
    doc.x = startX;
    doc.moveDown(0.5); // Reduce space after header

    // Draw a line to separate header
    doc.moveTo(startX, doc.y).lineTo(550, doc.y).stroke();

    doc.moveDown(1); // Small spacing after line

    doc.fontSize(14).text(tenant.businessName, { bold: true });

    // Check if businessBillingAddress exists and has valid fields
    if (tenant.businessBillingAddress) {
      const { addressLine, city, province, zipCode, country } = tenant.businessBillingAddress;
      let addressParts = [];

      if (addressLine?.trim()) doc.fontSize(10).text(addressLine);
      if (city?.trim()) addressParts.push(city);
      if (province?.trim()) addressParts.push(province);
      if (zipCode?.trim()) addressParts.push(zipCode);
      //if (country?.trim()) addressParts.push(country);

      if (addressParts.length > 0) {
        doc.fontSize(10).text(addressParts.join(', '));
      }
    }

    if (tenant.businessPhone) {
      doc.text(tenant.businessPhone);
    }

    if (tenant.businessEmail) {
      doc.text(tenant.businessEmail);
    }

    if (tenant.businessWebsite) {
      doc.text(tenant.businessWebsite);
    }

    /*  if (tenant.businessTaxID) {
      doc.text(`Tax ID: ${tenant.businessTaxID}`);
    } */

    doc.moveDown();
  }

  // Document Specific Details
  /* doc.fontSize(12).text(`ID: ${entity.purchaseOrderNumber}`);
  doc.text(`Date: ${entity.createdAt}`); */

  /* if (entity.vendor) {
    doc.text(`Vendor: ${entity.vendor.companyName}`);
  }

  if (entity.customer) {
    doc.text(`Customer: ${entity.customer.name}`);
  }
 */
  doc.moveDown();
};

/**
 * Generate a Purchase Order PDF
 * @param {Object} purchaseOrder - The purchase order data
 * @returns {Promise<string>}
 */
const generatePurchaseOrderPDF = async (purchaseOrder) => {
  return generatePDF((doc) => {
    //console.log(purchaseOrder);
    generatePDFHeader(doc, purchaseOrder, 'Purchase Order');

    /*  doc.fontSize(18).text('Purchase Order', { align: 'center' });
    doc.moveDown();
 */
    doc.fontSize(12).text(`Order ID: ${purchaseOrder.purchaseOrderNumber}`);
    doc.text(`Date: ${purchaseOrder.date}`);
    doc.text(`Vendor: ${purchaseOrder.vendor.companyName}`);
    // doc.text(`Customer: ${purchaseOrder.customer.name}`);
    doc.moveDown();

    doc.text('Items:');
    // Define table column positions
    const tableTop = doc.y + 10; // Start below header
    const columnWidths = [50, 200, 80, 80, 100]; // Column widths: Index, Name, Quantity, Price, Total

    // Table Header
    doc.fontSize(12).text('No.', 50, tableTop, { bold: true });
    doc.text('Item Name', 100, tableTop, { bold: true });
    doc.text('Qty', 300, tableTop, { bold: true });
    doc.text('Price', 380, tableTop, { bold: true });
    doc.text('Total', 460, tableTop, { bold: true });

    // Draw line under header
    doc
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    // Table Rows
    let yPos = tableTop + 25;
    purchaseOrder.items.forEach((item, index) => {
      doc.text(`${index + 1}`, 50, yPos);
      doc.text(item.itemName, 100, yPos);
      doc.text(item.quantity.toString(), 300, yPos);
      doc.text(`$${item.price.toFixed(2)}`, 380, yPos);
      doc.text(`$${(item.quantity * item.price).toFixed(2)}`, 460, yPos);
      yPos += 20; // Move to the next row
    });

    // Draw Total Row
    doc
      .moveTo(50, yPos + 5)
      .lineTo(550, yPos + 5)
      .stroke(); // Line above total
    doc.fontSize(12).text(`Total: $${purchaseOrder.total.toFixed(2)}`, 460, yPos + 10, { bold: true });

    /*  purchaseOrder.items.forEach((item, index) => {
      doc.text(
        `${index + 1}. ${item.itemName} - ${item.quantity} x $${item.price.toFixed(2)} = $${(
          item.quantity * item.price
        ).toFixed(2)}`
      );
    });

    doc.moveDown();
    doc.text(`Total: $${purchaseOrder.total.toFixed(2)}`, { align: 'right' }); */
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
