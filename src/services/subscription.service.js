const Stripe = require('stripe');
const config = require('../config/config');
const { Subscription } = require('../models');
const stripe = Stripe(config.stripe.secretKey);

const createCheckoutSession = async ({ customerEmail, priceId }) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      /*  ui_mode: 'custom', */
      payment_method_types: ['card'],
      customer_email: customerEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 1, // Optional: adjust as needed
        trial_settings: {
          end_behavior: {
            missing_payment_method: 'cancel',
          },
        },
      },
      success_url: `${config.frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.frontendUrl}/cancel`,
    });

    console.log(session);

    return {
      sessionId: session.id,
      subscriptionId: session.subscription,
    };
  } catch (error) {
    console.error('Failed to create checkout session:', error);
    throw new Error('Unable to create checkout session');
  }
};

const createTrialSubscription = async (name, email, price, tenantId) => {
  console.log('logging just email', email);

  const customer = await stripe.customers.create({
    name: name,
    email: email,
  });

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price }],
    trial_period_days: 7, // or whatever trial you want
    payment_behavior: 'default_incomplete',
    trial_settings: {
      end_behavior: {
        missing_payment_method: 'cancel',
      },
    },
    metadata: {
      tenantId, // Optional, but nice to have on subscription too
    },
  });

  return {
    subscriptionId: subscription.id,
    customerId: customer.id,
    trialEndsAt: subscription.trial_end,
  };
};

const createSubscription = async (subscriptionData) => {
  const subscription = await Subscription.create(subscriptionData);
  return subscription;
};

module.exports = {
  createCheckoutSession,
  createTrialSubscription,
  createSubscription,
};
