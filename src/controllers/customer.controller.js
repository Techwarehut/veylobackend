const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { customerService, emailService } = require('../services');

// Create a new customer
const createCustomer = catchAsync(async (req, res) => {
  const tenantId = req.query.tenantId;

  if (!tenantId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Tenant ID is required');
  }

  const customerData = { ...req.body, tenantId };
  const customer = await customerService.createCustomer(customerData);

  res.status(httpStatus.CREATED).send(customer);
});

// Get all customers with optional filters and pagination
const getCustomers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['customerName', 'businessName', 'isActive']);
  if (req.query.tenantId) {
    filter.tenantId = req.query.tenantId;
  }

  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  console.log(filter, options);
  const result = await customerService.queryCustomers(filter, options);

  res.send(result);
});

// Get a specific customer by ID
const getCustomer = catchAsync(async (req, res) => {
  const customer = await customerService.getCustomerById(req.params.customerId);
  if (!customer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
  }
  res.send(customer);
});

// Update a customer by ID
const updateCustomer = catchAsync(async (req, res) => {
  const customer = await customerService.updateCustomerById(req.params.customerId, req.body);
  res.send(customer);
});

// Delete a customer by ID
const deleteCustomer = catchAsync(async (req, res) => {
  await customerService.deleteCustomerById(req.params.customerId);
  res.status(httpStatus.NO_CONTENT).send();
});

// Activate a customer
const activateCustomer = catchAsync(async (req, res) => {
  const customer = await customerService.activateCustomerById(req.params.customerId);
  res.send(customer);
});

// Deactivate a customer
const deactivateCustomer = catchAsync(async (req, res) => {
  const customer = await customerService.deactivateCustomerById(req.params.customerId);
  res.send(customer);
});

module.exports = {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  activateCustomer,
  deactivateCustomer,
};
