const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { vendorService } = require('../services');

// Create a new vendor
const createVendor = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantID;

  if (!tenantId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Tenant ID is required');
  }

  const vendorData = { ...req.body, tenantId };
  const vendor = await vendorService.createVendor(vendorData);

  res.status(httpStatus.CREATED).send(vendor);
});

// Get all vendors with optional filters and pagination
const getVendors = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['companyName', 'isActive']);

  filter.tenantId = req.user.tenantID;

  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  if (!options.sortBy) {
    options.sortBy = 'companyName'; // Default to sorting by company name
  }

  const result = await vendorService.queryVendors(filter, options);

  res.send(result);
});

// Get a specific vendor by ID
const getVendor = catchAsync(async (req, res) => {
  const vendor = await vendorService.getVendorById(req.params.vendorId);
  if (!vendor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
  }
  res.send(vendor);
});

// Update a vendor by ID
const updateVendor = catchAsync(async (req, res) => {
  const vendor = await vendorService.updateVendorById(req.params.vendorId, req.body);
  res.send(vendor);
});

// Delete a vendor by ID
const deleteVendor = catchAsync(async (req, res) => {
  await vendorService.deleteVendorById(req.params.vendorId);
  res.status(httpStatus.NO_CONTENT).send();
});

// Activate a vendor
const activateVendor = catchAsync(async (req, res) => {
  const vendor = await vendorService.activateVendorById(req.params.vendorId);
  res.send(vendor);
});

// Deactivate a vendor
const deactivateVendor = catchAsync(async (req, res) => {
  const vendor = await vendorService.deactivateVendorById(req.params.vendorId);
  res.send(vendor);
});

module.exports = {
  createVendor,
  getVendors,
  getVendor,
  updateVendor,
  deleteVendor,
  activateVendor,
  deactivateVendor,
};
