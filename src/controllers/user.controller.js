const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService, emailService } = require('../services');
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
});

const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.send(user);
});

const updateUser = catchAsync(async (req, res) => {
  const user = await userService.updateUserById(req.params.userId, req.body);
  res.send(user);
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
};
