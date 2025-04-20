const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const subscriptionService = require('../services/subscription.service');

const createCheckoutSession = catchAsync(async (req, res) => {
  const user = req.user;
  const { email, price } = req.body;
  console.log('Received:', req.body);
  if (!user?.email || !price) {
    return res.status(httpStatus.BAD_REQUEST).send({ message: 'Missing user email or priceId' });
  }

  /*  const { sessionId, subscriptionId } = await subscriptionService.createCheckoutSession({
    customerEmail: user.email,
    priceId,
  }); */

  const { subscriptionId, customerId, trialEndsAt } = await subscriptionService.createTrialSubscription(email, price);

  res.status(httpStatus.OK).send({
    subscriptionId,
    customerId,
    trialEndsAt,
  });
});

module.exports = {
  createCheckoutSession,
};
