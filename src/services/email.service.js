const { Resend } = require('resend');
const config = require('../config/config');
const logger = require('../config/logger');
const PurchaseOrder = require('../models/purchaseOrder.model');
const { generatePurchaseOrderPDF } = require('./pdf.service');

const resend = new Resend(config.email.resendApiKey); // Use your Resend API key here

/**
 * Send an email with both HTML and plain text
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @param {string} html
 * @param {Array} attachments (optional)
 * @returns {Promise}
 */
const sendEmail = async (to, subject, text, html, attachments = []) => {
  try {
    await resend.emails.send({
      from: config.email.from,
      to,
      subject,
      text,
      html,
      attachments,
    });
    logger.info(`Email sent to ${to}`);
  } catch (error) {
    logger.error(`Failed to send email to ${to}: ${error.message}`);
  }
};

const sendResetPasswordEmail = async (to, token) => {
  const subject = 'Reset your Veylo password';
  const resetPasswordUrl = `https://auth.veylo.app/resetpassword?token=${token}`;
  const text = `Reset your password: ${resetPasswordUrl}`;
  const html = `
    <p>Dear user,</p>
    <p>To reset your password, click the button below:</p>
    <a href="${resetPasswordUrl}" style="display:inline-block;padding:10px 20px;background:#2b4f73;color:#fff;text-decoration:none;border-radius:4px;">Reset Password</a>
    <p>If you didn’t request this, just ignore this email.</p>
  `;

  await sendEmail(to, subject, text, html);
};

const sendVerificationEmail = async (to, token, name) => {
  const subject = 'Verify your email address';
  const verificationUrl = `https://auth.veylo.app/verifyemail?token=${token}`;
  const text = `Verify your account: ${verificationUrl}`;
  const html = `
    <p>Dear ${name},</p>
    <p>Welcome to Veylo! Click the button below to verify your email address:</p>
    <a href="${verificationUrl}" style="display:inline-block;padding:10px 20px;background:#2b4f73;color:#fff;text-decoration:none;border-radius:4px;">Verify Email</a>
    <p>If you didn’t create an account, just ignore this email.</p>
  `;

  await sendEmail(to, subject, text, html);
};

const sendOnboardingEmail = async (to, name, password) => {
  const subject = 'Welcome to Veylo – Your Account Info';
  const loginUrl = `https://auth.veylo.app/`;
  const downloadUrl = `https://veylo.app/download`;

  const text = `
Welcome to Veylo, ${name}!

Your account has been created.

Username: ${to}
Password: ${password}

Login: ${loginUrl}
iOS/Android App: ${downloadUrl}
Coupon: VEYLOVISIONARY (80% off for first year)
`;

  const html = `
    <p>Dear ${name},</p>
    <p>Welcome to <strong>Veylo</strong>! We're thrilled to have you on board.</p>
    <p><strong>Here are your login details:</strong></p>
    <ul>
      <li>Username: <strong>${to}</strong></li>
      <li>Password: <strong>${password}</strong></li>
    </ul>
    <p><a href="${loginUrl}" style="display:inline-block;padding:10px 20px;background:#2b4f73;color:#fff;text-decoration:none;border-radius:4px;">Login to Your Account</a></p>
    <p>Download our mobile app:</p>
    <ul>
      <li><a href="${downloadUrl}">Download on iOS</a></li>
      <li><a href="${downloadUrl}">Download on Android</a></li>
    </ul>
    <p>🎉 Use coupon code <strong>VEYLOVISIONARY</strong> for <strong>80% off</strong> your first year!</p>
    <p>If you didn’t sign up for Veylo, you can ignore this email.</p>
    <p>Best,<br>The Veylo Team</p>
  `;

  await sendEmail(to, subject, text, html);
};

const sendPurchaseOrderEmail = async (purchaseOrder) => {
  const subject = `Purchase Order #${purchaseOrder.purchaseOrderNumber}`;
  const contactName = purchaseOrder.vendor.contactPerson?.name || purchaseOrder.vendor.companyName;
  const email = purchaseOrder.vendor.contactPerson.email;

  const text = `Dear ${contactName},\n\nPlease find attached the purchase order #${purchaseOrder.purchaseOrderNumber}.\n\nRegards,\nThe Veylo Team`;

  const html = `
    <p>Dear ${contactName},</p>
    <p>Please find attached the purchase order <strong>#${purchaseOrder.purchaseOrderNumber}</strong>.</p>
    <p>Best regards,<br>The Veylo Team</p>
  `;

  const pdfBuffer = await generatePurchaseOrderPDF(purchaseOrder);

  await sendEmail(email, subject, text, html, [
    {
      filename: `purchase-order-${purchaseOrder.purchaseOrderNumber}.pdf`,
      content: pdfBuffer.toString('base64'),
      type: 'application/pdf',
      disposition: 'attachment',
    },
  ]);
};

module.exports = {
  sendEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
  sendOnboardingEmail,
  sendPurchaseOrderEmail,
};
