const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { authService, userService, tokenService, emailService, tenantService, jobtypesService } = require('../services');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const subscriptionService = require('../services/subscription.service');

/* const register = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  const tokens = await tokenService.generateAuthTokens(user);
  res.status(httpStatus.CREATED).send({ user, tokens });
}); */

/**
 * Register a new user and tenant

 */
const register = catchAsync(async (req, res) => {
  const { businessName, country, currency, name, email, password } = req.body;

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

  const { subscriptionId, customerId, trialEndsAt } = await subscriptionService.createTrialSubscription(
    name,
    email,
    'price_1REanY2LrCWcY5jGvulyNA23',
    tenant._id.toString()
  );

  const subscription = await subscriptionService.createSubscription({
    tenant: tenant._id,
    stripeSubscriptionId: subscriptionId,
    customerId: customerId,
    planType: 'Core',
    subscriptionStartDate: today,
    subscriptionEndDate: new Date(trialEndsAt * 1000), // Or subscription.current_period_end from Stripe
    trialStartDate: today,
    trialEndDate: new Date(trialEndsAt * 1000),
    status: 'trialing',
    currency: currency,
  });

  console.log(subscription);
  // ✅ Update tenant with subscription reference
  tenant.subscription = subscription._id;
  await tenant.save();

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
  res.send({ user, tokens });
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
