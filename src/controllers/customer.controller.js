const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { customerService, emailService } = require('../services');

// Create a new customer
const createCustomer = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantID;

  if (!tenantId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Tenant ID is required');
  }

  const customerData = { ...req.body, tenantId };
  const customer = await customerService.createCustomer(customerData);
  const billing = customer.billingAddress || {};

  const siteLocationData = {
    siteName: billing.City ? `${billing.City} Site` : 'Main Site',
    siteContactPerson: customer.customerName || '',
    siteContactPhone: customer.phone || '',
    AddressLine: billing.AddressLine || '',
    City: billing.City || '',
    Province: billing.Province || '',
    zipcode: billing.zipcode || '',
  };

  await customerService.addSiteLocation(customer.id, siteLocationData);
  const updatedcustomer = await customerService.getCustomerById(customer.id);

  console.log(updatedcustomer);

  res.status(httpStatus.CREATED).send(updatedcustomer);
});

// Get all customers with optional filters and pagination
const getCustomers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['customerName', 'businessName', 'isActive']);
  //if (req.query.tenantID) {
  filter.tenantId = req.user.tenantID;
  // }

  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  if (!options.sortBy) {
    options.sortBy = 'businessName'; // Default to sorting by name
  }

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

const getSiteLocations = catchAsync(async (req, res) => {
  const customerId = req.params.customerId;
  const siteLocations = await customerService.getSiteLocations(customerId);

  if (!siteLocations) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No site locations found for the customer');
  }

  res.send(siteLocations);
});

const addSiteLocation = catchAsync(async (req, res) => {
  const customerId = req.params.customerId;
  const siteLocationData = req.body;
  const siteLocation = await customerService.addSiteLocation(customerId, siteLocationData);

  res.status(httpStatus.CREATED).send(siteLocation);
});

const deleteSiteLocation = catchAsync(async (req, res) => {
  const { customerId, siteLocationId } = req.params;
  await customerService.deleteSiteLocation(customerId, siteLocationId);
  res.status(httpStatus.NO_CONTENT).send();
});

const updateSiteLocation = catchAsync(async (req, res) => {
  const { customerId, siteLocationId } = req.params;
  const updatedData = req.body;
  const updatedSiteLocation = await customerService.updateSiteLocation(customerId, siteLocationId, updatedData);
  res.send(updatedSiteLocation);
});

module.exports = {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  activateCustomer,
  deactivateCustomer,
  getSiteLocations,
  addSiteLocation,
  deleteSiteLocation,
  updateSiteLocation,
};
