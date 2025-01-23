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
 * Generate a Purchase Order PDF
 * @param {Object} purchaseOrder - The purchase order data
 * @returns {Promise<string>}
 */
const generatePurchaseOrderPDF = async (purchaseOrder) => {
  return generatePDF((doc) => {
    doc.fontSize(18).text('Purchase Order', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Order ID: ${purchaseOrder.id}`);
    doc.text(`Date: ${purchaseOrder.date}`);
    doc.text(`Vendor: ${purchaseOrder.vendor.name}`);
    // doc.text(`Customer: ${purchaseOrder.customer.name}`);
    doc.moveDown();

    doc.text('Items:');
    purchaseOrder.items.forEach((item, index) => {
      doc.text(
        `${index + 1}. ${item.name} - ${item.quantity} x $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(
          2
        )}`
      );
    });

    doc.moveDown();
    doc.text(`Total: $${purchaseOrder.total.toFixed(2)}`, { align: 'right' });
  });
};

/**
 * Generate an Invoice PDF
 * @param {Object} invoice - The invoice data
 * @param {string} outputPath - The path to save the PDF
 * @returns {Promise<string>}
 */
const generateInvoicePDF = async (invoice, outputPath) => {
  return generatePDF(outputPath, (doc) => {
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
  return generatePDF(outputPath, (doc) => {
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
  return generatePDF(outputPath, (doc) => {
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
