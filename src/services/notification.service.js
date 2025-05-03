const { Expo } = require('expo-server-sdk');
const logger = require('../config/logger');

const expo = new Expo();

/**
 * Send push notifications to a list of Expo push tokens
 * @param {string[]} tokens - Array of valid Expo push tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Optional data payload
 * @returns {Promise<Array>} - Array of ticket responses
 */
const sendNotificationsToUsers = async (tokens, title, body, data = {}) => {
  // Filter only valid Expo push tokens
  const validTokens = tokens.filter((token) => Expo.isExpoPushToken(token));

  // Create message objects
  const messages = validTokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));

  // Split into chunks and send
  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      logger.error('Error sending push notification chunk:', error);
    }
  }

  return tickets;
};

module.exports = {
  sendNotificationsToUsers,
};
