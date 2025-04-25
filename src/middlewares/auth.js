const passport = require('passport');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { roleRights } = require('../config/roles');
const { Subscription } = require('../models');

const verifyCallback = (req, resolve, reject, requiredRights) => async (err, user, info) => {
  if (err || info || !user) {
    return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
  }
  req.user = user;

  if (requiredRights.length) {
    const userRights = roleRights.get(user.role);
    const hasRequiredRights = requiredRights.every((requiredRight) => userRights.includes(requiredRight));
    if (!hasRequiredRights && req.params.userId !== user.id) {
      return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
    }
  }

  // Fetch the tenant's subscription to check the subscription status
  const subscription = await Subscription.findOne({ tenant: user.tenantID });
  if (!subscription) {
    return reject(new ApiError(httpStatus.FORBIDDEN, 'No active subscription found.'));
  }

  // Check if subscription is not canceled or inactive
  const validSubscriptionStatuses = ['active', 'trialing', 'payment attached', 'cancel scheduled']; // You can add other valid statuses here if needed
  if (!validSubscriptionStatuses.includes(subscription.status)) {
    return reject(new ApiError(httpStatus.FORBIDDEN, 'Subscription is not active.'));
  }

  resolve();
};

const auth =
  (...requiredRights) =>
  async (req, res, next) => {
    return new Promise((resolve, reject) => {
      passport.authenticate('jwt', { session: false }, verifyCallback(req, resolve, reject, requiredRights))(req, res, next);
    })
      .then(() => {
        //return tenantIdCheck(req, res, next);
        next();
      })
      .catch((err) => next(err));
  };

module.exports = auth;
