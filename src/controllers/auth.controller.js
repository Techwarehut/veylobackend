const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { authService, userService, tokenService, emailService, tenantService } = require('../services');
const ApiError = require('../utils/ApiError');

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

  // Calculate 30 days from today
  const subscriptionStartDate = today;
  const subscriptionEndDate = new Date(today);
  subscriptionEndDate.setDate(today.getDate() + 30); // 30 days from today

  // Step 1: Create the tenant

  const tenantData = {
    businessName: businessName, // Business name during registration
    businessEmail: email, // Business email
    currency: currency, // Currency
    subscriptionStartDate: subscriptionStartDate, // Start date for subscription
    subscriptionEndDate: subscriptionEndDate, // End date for subscription

    businessBillingAddress: {
      country: country, // Country is inside the businessBillingAddress object
    },
  };

  let tenant;
  try {
    tenant = await tenantService.createTenant(tenantData);
  } catch (error) {
    // Handle tenant creation failure
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create tenant');
  }

  // Step 2: Create the user and associate with the tenant
  const userData = {
    name,
    email,
    password,
    tenantID: tenant._id, // Associate user with tenant
  };

  let user;
  try {
    user = await userService.createUser(userData);
  } catch (error) {
    // Handle user creation failure
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create user');
  }

  // Step 3: Generate auth tokens for the user
  const tokens = await tokenService.generateAuthTokens(user);

  // Step 4: Respond with user, tenant, and tokens
  res.status(httpStatus.CREATED).send({ user, tenant, tokens });
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
