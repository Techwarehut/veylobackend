const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService, emailService, tenantService } = require('../services');
const crypto = require('crypto');

// Function to generate a complex random password
const generateComplexPassword = () => {
  const length = 12; // Password length
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';

  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(crypto.randomInt(0, charset.length));
  }

  return password;
};

const createUser = catchAsync(async (req, res) => {
  // Get tenantId from query parameters

  const tenantId = req.user.tenantID;

  // Ensure tenantId exists
  if (!tenantId) {
    return res.status(httpStatus.BAD_REQUEST).send({
      message: 'Tenant ID is required',
    });
  }

  const tenant = await tenantService.getTenantById(tenantId);

  //return erron if employCount already reached
  // Check if employee count limit is reached
  const currentUsers = await userService.countUsersByTenantId(tenantId);
  const maxAllowed = tenant.subscription.employeeCount || 0;

  console.log(currentUsers, maxAllowed);

  if (currentUsers >= maxAllowed) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Employee limit reached for your subscription plan. Please Upgrade');
  }

  // Generate a complex password
  const password = generateComplexPassword();

  // Add tenantId to the request body before passing to the service
  const userData = { ...req.body, tenantID: tenantId, password: password };
  const user = await userService.createUser(userData);

  await emailService.sendOnboardingEmail(user.email, user.name, password);

  res.status(httpStatus.CREATED).send(user);
});

const getUsers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'role']);

  // Add tenant-specific filtering based on query params

  filter.tenantID = req.user.tenantID; // Filter users by tenantId

  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  if (!options.sortBy) {
    options.sortBy = 'name'; // Default to sorting by name
  }

  const result = await userService.queryUsers(filter, options);

  res.send(result);
  /*  res.send({
    count: result.results.length, // 👈 total number of users returned in this page
    results: result.results, // 👈 the actual users
  }); */
});

const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.send(user);
});

const getTenantForUser = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantID;

  const tenant = await tenantService.getTenantById(tenantId);
  if (!tenant) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tenant not found');
  }

  // Check if trial is still ongoing and paymentURL needs to be refreshed
  if (tenant.subscription?.status === 'trialing' && req.user.role === 'owner') {
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

  res.send(tenant);
});

const updateUser = catchAsync(async (req, res) => {
  const user = await userService.updateUserById(req.params.userId, req.body);
  res.send(user);
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

const uploadProfilePic = async (req, res) => {
  const tenantId = req.user.tenantID;
  if (!req.file) {
    console.error('Multer did not process the file. req.file is undefined.');
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    // Determine file URL (Cloud Storage or Local)
    const profileUrl = req.file.location || `uploads/${tenantId}/${req.file.filename}`;

    const user = await userService.updateUserProfilePicById(req.params.userId, profileUrl);

    res.send(user);

    /*  return res.status(200).json({
      message: 'Prfile Pic uploaded successfully',
      profileUrl: user.profileUrl,
    }); */
  } catch (error) {
    console.error('Error processing file upload:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  uploadProfilePic,
  getTenantForUser,
};
