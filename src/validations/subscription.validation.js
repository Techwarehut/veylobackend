const Joi = require('joi');

const createCheckoutSession = {
  body: Joi.object().keys({
    email: Joi.string().email().required(), // Must be a valid email
    price: Joi.string().required(), // Stripe Price ID is required
  }),
};

module.exports = {
  createCheckoutSession,
};
