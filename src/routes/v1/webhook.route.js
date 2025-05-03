const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const config = require('../../config/config');

const { subscriptionService, emailService, tenantService } = require('../../services');
const logger = require('../../config/logger');

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
      logger.error('Webhook signature verification failed.', err.message);
      return res.sendStatus(400);
    }

    // Handle event
    switch (event.type) {
      // payment_method.attached
      //checkout.session.completed
      //billing_portal.session.created
      //customer.subscription.updated
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
          subscriptionService.updateSubscriptionStatusById(subscriptionId, 'active');
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

          // ⬇️ Safely get customer email
          const tenant = await tenantService.getTenantById(tenantId);
          const customerEmail = tenant?.businessEmail;

          if (customerEmail) {
            const subject = "Don't miss out — 80% off for 1 year!";
            const text = `Hi there,
        
        We noticed you don't have a payment method on file, and we’d love for you to continue your journey with Veylo.
        
        As a thank you for being with us, here’s an exclusive offer: use the coupon code VEYLOVISIONARY to get 80% off for your first year!
        
        Update your payment method and apply the code to take advantage of this special deal.
        
        If you need help updating your payment details, just click here: ${tenant.subscription.paymentURL}
        
        Thank you for being a visionary with us,
        The Veylo App Team`;

            await emailService.sendEmail(customerEmail, subject, text);
          } else {
            logger.warn(`No business email found for tenant ${tenantId}`);
          }
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const tenantId = subscription.metadata?.tenantId;
        const subscriptionId = subscription.id;

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
        subscriptionService.updateSubscriptionStatusById(subscriptionId, 'cancelled');

        const tenant = await tenantService.getTenantById(tenantId);
        const customerEmail = tenant?.businessEmail;

        // ✉️ Send email to reactivate
        const subject = 'Your subscription was cancelled — Reactivate now!';
        const text = `Hi there,

        We're truly sorry to see you go. We value you as part of the Veylo family, and we'd love to have you back.
        
        To make it easier, here's a special offer just for you: use the coupon code WELCOME50 to get an additional 50% off when you reactivate your subscription.
        
        You can easily reactivate by clicking the link below:
        
        Reactivate your subscription: ${reactivationUrl}
        
        If there's anything we can do to improve your experience, feel free to reply and let us know.
        
        Thank you for being with us,
        The Veylo App Team`;

        if (customerEmail) {
          await emailService.sendEmail(customerEmail, subject, text);
        } else {
          logger.warn(`Customer email not found for customer ${customerId}`);
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const previousAttributes = event.data.previous_attributes;

        if (subscription.cancel_at_period_end) {
          // Mark as "cancel scheduled"
          subscriptionService.updateSubscriptionStatusById(subscription.id, 'cancel scheduled');
        } else if (previousAttributes && previousAttributes.items) {
          // Subscription items changed — possible plan change
          const oldPriceId = previousAttributes.items.data?.[0]?.price?.id;
          const newPriceId = subscription.items.data?.[0]?.price?.id;

          if (oldPriceId && newPriceId && oldPriceId !== newPriceId) {
            // Plan has changed

            await subscriptionService.handlePlanChange(subscription.id, newPriceId);
          } else {
            // No plan change, just normal update (reactivation etc)
            await subscriptionService.updateSubscriptionStatusById(subscription.id, subscription.status);
          }
        } else {
          // Cancel was **reversed**, reactivated
          await subscriptionService.updateSubscriptionStatusById(
            subscription.id,
            subscription.status // probably 'active'
          );
        }

        break;
      }

      case 'payment_method.detached': {
        const subscription = event.data.object;

        const tenantId = subscription.metadata?.tenantId;

        const tenant = await tenantService.getTenantById(tenantId);
        const customerEmail = tenant?.businessEmail;

        // Cancel was **reversed**, reactivated
        await subscriptionService.updateSubscriptionStatusById(
          subscription.id,
          subscription.status // probably 'active'
        );

        if (customerEmail) {
          const subject = 'Important: Your payment method has been removed';
          const text = `Hi there,
      
      We noticed that you've removed your payment method from your Veylo account.
      
      Without an active payment method, your future invoices might fail and your subscription could be interrupted.
      
      To keep your services running smoothly, please add a new payment method here: ${tenant.subscription.paymentURL}
      
      If you need any help or have questions, feel free to reach out!
      
      Thanks for being part of Veylo,  
      The Veylo App Team`;

          await emailService.sendEmail(customerEmail, subject, text);
        } else {
          logger.warn(`No business email found for customer ${customerId}`);
        }

        break;
      }

      // Add more cases as needed
      default:
        logger.error(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  }
);

module.exports = router;
