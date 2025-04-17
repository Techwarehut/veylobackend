const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const subscriptionService = require('../services/subscription.service');

const createCheckoutSession = catchAsync(async (req, res) => {
  const user = req.user;
  const { priceId } = req.body;

  const session = await subscriptionService.createCheckoutSession({
    customerEmail: user.email,
    priceId,
  });

  res.status(httpStatus.OK).send({ sessionId: session.id });
});

module.exports = {
  createCheckoutSession,
};
