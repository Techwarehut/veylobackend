const Joi = require('joi');

const createCheckoutSession = {
  body: Joi.object().keys({
    customerEmail: Joi.string().email().required(), // Must be a valid email
    priceId: Joi.string().required(), // Stripe Price ID is required
  }),
};

module.exports = {
  createCheckoutSession,
};
