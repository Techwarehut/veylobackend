const Stripe = require('stripe');
const config = require('../config/config');

const stripe = Stripe(config.stripe.secretKey);

const createCheckoutSession = async ({ customerEmail, priceId }) => {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: customerEmail,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: 14, // You can make this configurable if needed
    },
    success_url: `${config.frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.frontendUrl}/cancel`,
  });

  return session;
};

module.exports = {
  createCheckoutSession,
};
