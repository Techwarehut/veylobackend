const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const config = require('../../config/config');
const subscriptionService = require('../../services/subscription.service');

const stripe = Stripe(config.stripe.secretKey);

// Raw body parser for webhook
router.post(
  '/',
  express.raw({ type: 'application/json' }), // important!
  async (req, res) => {
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
      case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const subscriptionId = invoice.subscription;
        const paymentStatus = invoice.payment_status;

        // Retrieve subscription to get metadata
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const tenantId = subscription.metadata?.tenantId;

          // 💾 Update your DB: mark tenant as active (or paid)
          subscriptionService.updateSubscriptionStatusById(subscriptionId, 'active', '');
        }

        // ✉️ Send welcome email (custom logic)
        // await sendWelcomeEmail(tenantId);
        break;

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const subscriptionId = subscription.id;

        // Check if a payment method is already attached
        const customer = await stripe.customers.retrieve(customerId);
        const hasDefaultPaymentMethod = customer.invoice_settings?.default_payment_method;

        if (!hasDefaultPaymentMethod) {
          const tenantId = subscription.metadata?.tenantId;

          // Send reminder email with a link to add payment method (Checkout Setup Mode)
          //await sendTrialEndingEmail(tenantId, customerId);
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const tenantId = subscription.metadata?.tenantId;

        // ⬇️ Get the price ID user was subscribed to
        const priceId = subscription.items.data[0].price.id;

        // ⬇️ Reactivation link using that same price
        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          customer: customerId,
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          success_url: `${config.frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${config.frontendUrl}/cancel`,
          metadata: {
            tenantId,
          },
        });

        const reactivationUrl = session.url;

        // 💾 Update your DB: mark tenant as active (or paid)
        subscriptionService.updateSubscriptionStatusById(subscriptionId, 'cancelled', reactivationUrl);

        // ✉️ Send email to reactivate
        //await sendTrialEndedEmail(tenantId, reactivationUrl);

        break;
      }

      // Add more cases as needed
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  }
);

module.exports = router;
