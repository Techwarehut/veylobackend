const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const config = require('../../config/config');

const stripe = Stripe(config.stripe.secretKey);

// Raw body parser for webhook
router.post(
  '/',
  express.raw({ type: 'application/json' }), // important!
  async (req, res) => {
    console.log('I am in');
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        config.stripe.webhookSecret //process.env.STRIPE_WEBHOOK_SECRET // provided in `stripe listen` output
      );
    } catch (err) {
      console.error('Webhook signature verification failed.', err.message);
      return res.sendStatus(400);
    }

    console.log(event.type);

    // Handle event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('✅ Checkout Session completed:', session);
        // do something with session
        break;

      case 'invoice.paid':
        console.log('💰 Invoice paid');
        break;

      case 'customer.subscription.created':
        console.log('📦 Subscription created');
        break;

      // Add more cases as needed
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  }
);

module.exports = router;
