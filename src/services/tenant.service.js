const httpStatus = require('http-status');
const { Tenant } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a tenant
 * @param {Object} tenantBody
 * @returns {Promise<Tenant>}
 */
const createTenant = async (tenantBody) => {
  try {
    // Ensure all required fields are provided and valid
    if (
      !tenantBody.businessName ||
      !tenantBody.businessEmail ||
      !tenantBody.currency ||
      !tenantBody.subscriptionStartDate ||
      !tenantBody.subscriptionEndDate
    ) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Missing required fields for tenant creation');
    }

    // Check for duplicate business email or any other unique fields if necessary
    const existingTenant = await Tenant.findOne({ businessEmail: tenantBody.businessEmail });
    if (existingTenant) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Business email already exists');
    }

    // Create the tenant
    const tenant = await Tenant.create(tenantBody);

    return tenant;
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create tenant');
  }
};
/**
 * Query tenants
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryTenants = async (filter, options) => {
  const tenants = await Tenant.paginate(filter, options);
  return tenants;
};

/**
 * Get tenant by id
 * @param {ObjectId} id
 * @returns {Promise<Tenant>}
 */
const getTenantById = async (id) => {
  return Tenant.findById(id);
};

/**
 * Get tenant by business name
 * @param {string} businessName
 * @returns {Promise<Tenant>}
 */
const getTenantByBusinessName = async (businessName) => {
  return Tenant.findOne({ businessName }); // Not enforcing uniqueness
};

/**
 * Update tenant by id
 * @param {ObjectId} tenantId
 * @param {Object} updateBody
 * @returns {Promise<Tenant>}
 */
const updateTenantById = async (tenantId, updateBody) => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tenant not found');
  }

  // Update logic, ensure that businessName isn't checked for uniqueness
  Object.assign(tenant, updateBody);
  await tenant.save();
  return tenant;
};

/**
 * Delete tenant by id
 * @param {ObjectId} tenantId
 * @returns {Promise<Tenant>}
 */
const deleteTenantById = async (tenantId) => {
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tenant not found');
  }
  await tenant.remove();
  return tenant;
};

const updateTenantLogo = async (tenantId, logoUrl) => {
  try {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    tenant.businessLogo = logoUrl;
    await tenant.save();
    return tenant;
  } catch (error) {
    throw new Error('Error updating tenant logo');
  }
};

module.exports = {
  createTenant,
  queryTenants,
  getTenantById,
  getTenantByBusinessName,
  updateTenantById,
  deleteTenantById,
  updateTenantLogo,
};
