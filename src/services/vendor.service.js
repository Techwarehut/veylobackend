const httpStatus = require('http-status');
const { Vendor } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a vendor
 * @param {Object} vendorBody
 * @returns {Promise<Vendor>}
 */
const createVendor = async (vendorBody) => {
  if (await Vendor.isEmailTaken(vendorBody.contactPerson.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  return Vendor.create(vendorBody);
};

/**
 * Query for vendors
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryVendors = async (filter, options) => {
  const vendors = await Vendor.paginate(filter, options);
  return vendors;
};

/**
 * Get vendor by id
 * @param {ObjectId} id
 * @returns {Promise<Vendor>}
 */
const getVendorById = async (id) => {
  return Vendor.findById(id);
};

/**
 * Get vendor by email
 * @param {string} email
 * @returns {Promise<Vendor>}
 */
const getVendorByEmail = async (email) => {
  return Vendor.findOne({ 'contactPerson.email': email });
};

/**
 * Update vendor by id
 * @param {ObjectId} vendorId
 * @param {Object} updateBody
 * @returns {Promise<Vendor>}
 */
const updateVendorById = async (vendorId, updateBody) => {
  const vendor = await getVendorById(vendorId);
  if (!vendor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
  }
  if (updateBody.contactPerson?.email && (await Vendor.isEmailTaken(updateBody.contactPerson.email, vendorId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  Object.assign(vendor, updateBody);
  await vendor.save();
  return vendor;
};

/**
 * Delete vendor by id
 * @param {ObjectId} vendorId
 * @returns {Promise<Vendor>}
 */
const deleteVendorById = async (vendorId) => {
  const vendor = await getVendorById(vendorId);
  if (!vendor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
  }
  await vendor.remove();
  return vendor;
};

/**
 * Activate vendor by id
 * @param {ObjectId} vendorId
 * @returns {Promise<Vendor>}
 */
const activateVendor = async (vendorId) => {
  const vendor = await getVendorById(vendorId);
  if (!vendor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
  }
  vendor.isActive = true;
  await vendor.save();
  return vendor;
};

/**
 * Deactivate vendor by id
 * @param {ObjectId} vendorId
 * @returns {Promise<Vendor>}
 */
const deactivateVendor = async (vendorId) => {
  const vendor = await getVendorById(vendorId);
  if (!vendor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
  }
  vendor.isActive = false;
  await vendor.save();
  return vendor;
};

module.exports = {
  createVendor,
  queryVendors,
  getVendorById,
  getVendorByEmail,
  updateVendorById,
  deleteVendorById,
  activateVendor,
  deactivateVendor,
};
