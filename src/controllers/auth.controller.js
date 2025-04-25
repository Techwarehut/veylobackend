const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { authService, userService, tokenService, emailService, tenantService, jobtypesService } = require('../services');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const subscriptionService = require('../services/subscription.service');
const { Tenant } = require('../models');

/* const register = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  const tokens = await tokenService.generateAuthTokens(user);
  res.status(httpStatus.CREATED).send({ user, tokens });
}); */

/**
 * Register a new user and tenant

 */
const register = catchAsync(async (req, res) => {
  const { businessName, country, currency, name, email, password, planType } = req.body;

  // Get today's date
  const today = new Date();

  // Step 1: Create the tenant

  const tenantData = {
    businessName: businessName, // Business name during registration
    businessEmail: email, // Business email
    currency: currency, // Currency

    businessBillingAddress: {
      country: country, // Country is inside the businessBillingAddress object
    },
  };

  let tenant;

  tenant = await tenantService.createTenant(tenantData);

  // Step 2: Add default job types for the newly created tenant
  const defaultJobTypes = ['Inspection', 'Service', 'Maintenance', 'Support'];
  await jobtypesService.createDefaultJobTypesForTenant(tenant._id, defaultJobTypes);

  // Step 2: Create the user and associate with the tenant
  const userData = {
    name,
    email,
    password,
    tenantID: tenant._id, // Associate user with tenant
  };

  let user;

  user = await userService.createUser(userData);

  let priceId;

  if (planType === 'Start Up') priceId = 'price_1RH3OR2LrCWcY5jGDBEuAa4o';
  else if (planType === 'Grow') priceId = 'price_1RH3Pa2LrCWcY5jGCrQxz3be';
  else if (planType === 'Enterprise') priceId = 'price_1RH3Ql2LrCWcY5jGpIlpKgls';

  const { subscriptionId, customerId, trialEndsAt, paymentURL } = await subscriptionService.createTrialSubscription(
    name,
    email,
    priceId,
    tenant._id.toString()
  );

  const subscription = await subscriptionService.createSubscription({
    tenant: tenant._id,
    stripeSubscriptionId: subscriptionId,
    customerId: customerId,
    planType: planType,
    priceId: priceId,
    subscriptionStartDate: today,
    subscriptionEndDate: new Date(trialEndsAt * 1000), // Or subscription.current_period_end from Stripe
    trialStartDate: today,
    trialEndDate: new Date(trialEndsAt * 1000),
    status: 'trialing',
    paymentURL: paymentURL,
    currency: currency,
  });

  // ✅ Update tenant with subscription reference
  tenant.subscription = subscription._id;
  await tenant.save();

  const populatedTenant = await Tenant.populate(tenant, [
    {
      path: 'subscription',
      select:
        'planType status employeeCount customerId subscriptionStartDate subscriptionEndDate trialStartDate trialEndDate',
    },
  ]);

  await tenant.populate('subscription');

  // Step 3: Generate auth tokens for the user
  const tokens = await tokenService.generateAuthTokens(user);

  // Step 4: Respond with user, tenant, and tokens
  res.status(httpStatus.CREATED).send({ user, tenant, tokens });

  const verifyEmailToken = await tokenService.generateVerifyEmailToken(user);
  emailService.sendVerificationEmail(user.email, verifyEmailToken, user.name).catch((error) => {
    // Create a new ApiError for consistent error handling
    const emailError = new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Error sending verification email', true, error.stack);

    // Log the error using the logger
    logger.error('Error sending verification email', {
      message: emailError.message,
      stack: emailError.stack,
      email: req.user.email,
    });

    // Optionally throw the error so it can be handled by errorHandler
    throw emailError; // This will pass the error to the next middleware
  });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);

  const tokens = await tokenService.generateAuthTokens(user);

  const tenant = await tenantService.getTenantById(user.tenantID);
  let paymentURL = tenant.subscription?.paymentURL;

  // Check if trial is still ongoing and paymentURL needs to be refreshed
  if (tenant.subscription?.status === 'trialing' && user.role === 'owner') {
    const now = new Date();
    const updatedAt = new Date(tenant.subscription.updatedAt);
    const isExpired = now - updatedAt > 24 * 60 * 60 * 1000;

    // OPTIONAL: check if payment method already exists to avoid regenerating session
    const hasPaymentMethod = await subscriptionService.hasPaymentMethod(tenant.subscription.customerId);
    if (!hasPaymentMethod && (!paymentURL || isExpired)) {
      // Create new setup session
      const URL = await subscriptionService.regenerateCheckoutSession(
        tenant.subscription.customerId,
        tenant.subscription.stripeSubscriptionId,
        tenant.id.toString(),
        'cad' //tenant.subscription.currency
      );

      // Update paymentURL in DB
      tenant.subscription.paymentURL = URL;
      await tenant.subscription.save();

      //paymentURL = newSession.url;
    } else if (hasPaymentMethod) {
      // 💡 Generate Stripe Customer Portal URL
      const URL = await subscriptionService.getCustomerPortalUrl(tenant.subscription.customerId);

      tenant.subscription.paymentURL = URL;
      tenant.subscription.status = 'payment attached'; // Optional: use another status like 'active' if it fits better
      await tenant.subscription.save();
    } else {
      // 💡 Generate Stripe Customer Portal URL
      const URL = await subscriptionService.getCustomerPortalUrl(tenant.subscription.customerId);

      tenant.subscription.paymentURL = URL;
      //tenant.subscription.status = 'paymentAdded'; // Optional: use another status like 'active' if it fits better
      await tenant.subscription.save();
    }
  }

  res.send({ user, tokens, tenant });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
  await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.query.token, req.body.password);
  res.status(httpStatus.NO_CONTENT).send();
});

const sendVerificationEmail = catchAsync(async (req, res) => {
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user);
  await emailService.sendVerificationEmail(req.user.email, verifyEmailToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.query.token);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
};
