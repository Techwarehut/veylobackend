const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('../config/logger');

const transport = nodemailer.createTransport(config.email.smtp);
/* istanbul ignore next */
if (config.env !== 'test') {
  transport
    .verify()
    .then(() => logger.info('Connected to email server'))
    .catch(() => logger.warn('Unable to connect to email server. Make sure you have configured the SMTP options in .env'));
}

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @returns {Promise}
 */
const sendEmail = async (to, subject, text) => {
  const msg = { from: config.email.from, to, subject, text };
  await transport.sendMail(msg);
};

/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendResetPasswordEmail = async (to, token) => {
  const subject = 'Reset password';
  // replace this url with the link to the reset password page of your front-end app
  const resetPasswordUrl = `https://veylo.app/resetpassword?token=${token}`;
  const text = `Dear user,
To reset your password, click on this link: ${resetPasswordUrl}
If you did not request any password resets, then ignore this email.`;
  await sendEmail(to, subject, text);
};

/**
 * Send verification email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendVerificationEmail = async (to, token) => {
  const subject = 'Email Verification';
  // replace this url with the link to the email verification page of your front-end app
  const verificationEmailUrl = `https://veylo.app/verify-email?token=${token}`;
  const text = `Dear user,
To verify your email, click on this link: ${verificationEmailUrl}
If you did not create an account, then ignore this email.`;
  await sendEmail(to, subject, text);
};

/**
 * Send an onboarding email
 * @param {string} to - The recipient email address
 * @param {string} username - The username (email in this case)
 * @param {string} password - The generated password
 * @returns {Promise}
 */
const sendOnboardingEmail = async (to, name, password) => {
  const subject = 'Welcome to Veylo - Your Account Details';

  // Define the links (login page and download apps links)
  const loginUrl = `https://veylo.app/login`; // Replace with your actual login page URL
  const downloadAppUrl = `https://veylo.app/download`; // Replace with the actual app download page URL

  // Construct the email body
  const text = `Dear ${name},

Congratulations on joining Veylo! We're excited to have you on board.

To get started, use the following credentials to log in to your account:
- Username: ${to}
- Password: ${password}

You can log in to your account using the link below:
- Login Link: ${loginUrl}

Additionally, download our mobile app from the links below to start using Veylo on the go:
- Download on iOS: ${downloadAppUrl} (iOS)
- Download on Android: ${downloadAppUrl} (Android)

If you have any questions or issues, feel free to reach out to our support team.

Best regards,
The Veylo Team

If you did not sign up for Veylo, please ignore this email.`;

  // Send the email using the sendEmail function
  await sendEmail(to, subject, text);
};

module.exports = {
  transport,
  sendEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
  sendOnboardingEmail,
};
