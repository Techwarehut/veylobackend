const httpStatus = require('http-status');
const { Customer } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a customer
 * @param {Object} customerBody
 * @returns {Promise<Customer>}
 */
const createCustomer = async (customerBody) => {
  if (await Customer.isEmailTaken(customerBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  return Customer.create(customerBody);
};

/**
 * Query for customers
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryCustomers = async (filter, options) => {
  const customers = await Customer.paginate(filter, options);
  return customers;
};

/**
 * Get customer by id
 * @param {ObjectId} id
 * @returns {Promise<Customer>}
 */
const getCustomerById = async (id) => {
  return Customer.findById(id);
};

/**
 * Get customer by email
 * @param {string} email
 * @returns {Promise<Customer>}
 */
const getCustomerByEmail = async (email) => {
  return Customer.findOne({ email });
};

/**
 * Update customer by id
 * @param {ObjectId} customerId
 * @param {Object} updateBody
 * @returns {Promise<Customer>}
 */
const updateCustomerById = async (customerId, updateBody) => {
  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
  }
  if (updateBody.email && (await Customer.isEmailTaken(updateBody.email, customerId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  Object.assign(customer, updateBody);
  await customer.save();
  return customer;
};

/**
 * Delete customer by id
 * @param {ObjectId} customerId
 * @returns {Promise<Customer>}
 */
const deleteCustomerById = async (customerId) => {
  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
  }
  await customer.remove();
  return customer;
};

/**
 * Activate customer by id
 * @param {ObjectId} customerId
 * @returns {Promise<Customer>}
 */
const activateCustomer = async (customerId) => {
  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
  }
  customer.isActive = true;
  await customer.save();
  return customer;
};

/**
 * Deactivate customer by id
 * @param {ObjectId} customerId
 * @returns {Promise<Customer>}
 */
const deactivateCustomer = async (customerId) => {
  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
  }
  customer.isActive = false;
  await customer.save();
  return customer;
};

/**
 * Get site locations by customer ID
 * @param {ObjectId} customerId
 * @returns {Promise<Array>}
 */
const getSiteLocations = async (customerId) => {
  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
  }
  return customer.siteLocations || [];
};

/**
 * Add a new site location for a customer
 * @param {ObjectId} customerId
 * @param {Object} siteLocationData
 * @returns {Promise<Object>}
 */
const addSiteLocation = async (customerId, siteLocationData) => {
  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
  }
  customer.siteLocations = customer.siteLocations || [];
  customer.siteLocations.push(siteLocationData);
  await customer.save();

  // Instead of fetching customer again, return the last added siteLocation directly
  return customer.siteLocations[customer.siteLocations.length - 1];
};

/**
 * Delete a site location by customer ID and site location ID
 * @param {ObjectId} customerId
 * @param {ObjectId} siteLocationId
 * @returns {Promise<void>}
 */
const deleteSiteLocation = async (customerId, siteLocationId) => {
  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  const siteLocationIndex = customer.siteLocations.findIndex((location) => location._id.toString() === siteLocationId);

  if (siteLocationIndex === -1) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Site location not found');
  }

  customer.siteLocations.splice(siteLocationIndex, 1);
  await customer.save();
};

/**
 * Update a site location by customer ID and site location ID
 * @param {ObjectId} customerId
 * @param {ObjectId} siteLocationId
 * @param {Object} updateBody
 * @returns {Promise<Object>}
 */
const updateSiteLocation = async (customerId, siteLocationId, updateBody) => {
  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  const siteLocation = customer.siteLocations.find((location) => location._id.toString() === siteLocationId);

  if (!siteLocation) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Site location not found');
  }

  Object.assign(siteLocation, updateBody);
  await customer.save();
  return siteLocation;
};

module.exports = {
  createCustomer,
  queryCustomers,
  getCustomerById,
  getCustomerByEmail,
  updateCustomerById,
  deleteCustomerById,
  activateCustomer,
  deactivateCustomer,
  addSiteLocation,
  getSiteLocations,
  deleteSiteLocation,
  updateSiteLocation,
};
