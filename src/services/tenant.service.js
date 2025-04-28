const httpStatus = require('http-status');
const { Tenant } = require('../models');
const ApiError = require('../utils/ApiError');
const subscriptionService = require('./subscription.service');

/**
 * Create a tenant
 * @param {Object} tenantBody
 * @returns {Promise<Tenant>}
 */
const createTenant = async (tenantBody) => {
  try {
    // Ensure all required fields are provided and valid
    if (!tenantBody.businessName || !tenantBody.businessEmail || !tenantBody.currency) {
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
    // Re-throw custom errors
    if (error instanceof ApiError) {
      throw error;
    }

    // Otherwise, wrap in internal server error
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
  const tenant = await Tenant.findById(id).populate('subscription');
  let paymentURL = tenant.subscription?.paymentURL;

  // Check if trial is still ongoing and paymentURL needs to be refreshed
  if (tenant.subscription?.status === 'trialing' /* && user.role === 'owner' */) {
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
      console.log(URL);

      tenant.subscription.paymentURL = URL;
      //tenant.subscription.status = 'paymentAdded'; // Optional: use another status like 'active' if it fits better
      await tenant.subscription.save();
    }
  } else {
    console.log('I am here');
    // 💡 Generate Stripe Customer Portal URL
    const URL = await subscriptionService.getCustomerPortalUrl(tenant.subscription.customerId);
    console.log(URL);

    tenant.subscription.paymentURL = URL;
    //tenant.subscription.status = 'paymentAdded'; // Optional: use another status like 'active' if it fits better
    await tenant.subscription.save();
  }
  return tenant;
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
