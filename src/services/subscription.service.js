const Stripe = require('stripe');
const config = require('../config/config');
const { Subscription } = require('../models');
const logger = require('../config/logger');
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

    return {
      sessionId: session.id,
      subscriptionId: session.subscription,
    };
  } catch (error) {
    logger.error('Failed to create checkout session:', error);
    throw new Error('Unable to create checkout session');
  }
};

const createTrialSubscription = async (name, email, price, tenantId) => {
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

  const session = await stripe.checkout.sessions.create({
    mode: 'setup', // collect payment method only
    customer: customer.id,

    setup_intent_data: {
      metadata: {
        subscriptionId: subscription.id,
        tenantId: tenantId,
      },
    },
    success_url: `${config.frontendUrl}/dashboard`,
    cancel_url: `${config.frontendUrl}`,
    currency: 'cad',
  });

  /* // Create a PaymentIntent instead of a Checkout session
  const paymentIntent = await stripe.paymentIntents.create({
    amount: price, // Amount in cents
    currency: 'usd',
    customer: customer.id,
    metadata: {
      subscriptionId: subscription.id,
      tenantId: tenantId,
    },
  });

  // Generate a URL to handle payment using the PaymentIntent
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    customer: customer.id,
    payment_intent: paymentIntent.id,
    success_url: `${config.frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.frontendUrl}/cancel`,
  }); */

  return {
    subscriptionId: subscription.id,
    customerId: customer.id,
    trialEndsAt: subscription.trial_end,
    paymentURL: session.url,
  };
};

const regenerateCheckoutSession = async (customerId, subscriptionId, tenantId, currency) => {
  // Check if the session has expired (e.g., compare the creation timestamp)
  const session = await stripe.checkout.sessions.create({
    mode: 'setup',
    customer: customerId,
    setup_intent_data: {
      metadata: {
        subscriptionId: subscriptionId,
        tenantId: tenantId,
      },
    },
    success_url: `${config.frontendUrl}/dashboard`,
    cancel_url: `${config.frontendUrl}/cancel`,
    currency: currency,
  });

  return session.url; // Return the new payment URL
};

const getCustomerPortalUrl = async (customerId) => {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${config.frontendUrl}/dashboard`, // wherever you want to redirect after they’re done
  });

  return session.url;
};

const createSubscription = async (subscriptionData) => {
  const subscription = await Subscription.create(subscriptionData);
  return subscription;
};

const getSubscriptionById = async (stripeSubscriptionId) => {
  return Subscription.findOne({ stripeSubscriptionId });
};

const hasPaymentMethod = async (customerId) => {
  const existingPaymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });

  const hasPaymentMethod = existingPaymentMethods.data.length > 0;

  return hasPaymentMethod;
};

const updateSubscriptionStatusById = async (subscriptionId, status) => {
  const subscription = await getSubscriptionById(subscriptionId);
  if (!subscription) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Subscription not found');
  }

  // Logic to handle different statuses
  switch (status) {
    case 'cancelled':
      subscription.status = 'cancelled';
      subscription.canceledAt = new Date();
      subscription.cancelAtPeriodEnd = true;

      break;

    case 'active':
      subscription.status = 'active';
      // Set subscription start and end dates based on the current date
      subscription.subscriptionStartDate = new Date();
      // Assuming 30-day billing cycle; adjust based on your business logic
      subscription.subscriptionEndDate = new Date(subscription.subscriptionStartDate);
      subscription.subscriptionEndDate.setDate(subscription.subscriptionStartDate.getDate() + 30);

      // Optionally, update trial dates (though these are not strictly necessary once active)
      subscription.trialStartDate = null;
      subscription.trialEndDate = null;
      subscription.paymentStatus = 'Paid';
      // Optionally, you can reset some fields or set new trial/end dates if necessary
      break;

    // Add more statuses if needed (e.g., past_due, incomplete, etc.)

    default:
      subscription.status = status;
      break;
  }
  await subscription.save();

  return subscription;
};

const handlePlanChange = async (subscriptionId, newPriceId) => {
  const subscription = await getSubscriptionById(subscriptionId);
  if (!subscription) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Subscription not found');
  }
  let planType;
  if (newPriceId === 'price_1RH3OR2LrCWcY5jGDBEuAa4o') planType = 'Start Up';
  else if (newPriceId === 'price_1RH3Pa2LrCWcY5jGCrQxz3be') planType = 'Grow';
  else if (newPriceId === 'price_1RH3Ql2LrCWcY5jGpIlpKgls') planType = 'Enterprise';

  subscription.planType = planType;

  await subscription.save();

  return subscription;
};

module.exports = {
  createCheckoutSession,
  createTrialSubscription,
  createSubscription,
  getSubscriptionById,
  updateSubscriptionStatusById,
  regenerateCheckoutSession,
  hasPaymentMethod,
  handlePlanChange,
  getCustomerPortalUrl,
};
