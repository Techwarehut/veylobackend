const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const subscriptionValidation = require('../../validations/subscription.validation');
const subscriptionController = require('../../controllers/subscription.controller');

const router = express.Router();

router
  .route('/create-checkout-session')
  .post(
    auth('createSubscription'),
    validate(subscriptionValidation.createCheckoutSession),
    subscriptionController.createCheckoutSession
  );

module.exports = router;
