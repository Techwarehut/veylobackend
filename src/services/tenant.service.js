const httpStatus = require('http-status');
const { Tenant } = require('../models');
const ApiError = require('../utils/ApiError');
const subscriptionService = require('./subscription.service');
const logger = require('../config/logger');

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
  logger.info(`tenantId: ${id}`);
  let tenant;
  try {
    tenant = await Tenant.findById(id).populate('subscription');
    if (!tenant) {
      logger.error(`❌ No tenant found with id: ${id}`);
      throw new Error('Tenant not found');
    }
    if (!tenant.subscription) {
      logger.error(`❌ Subscription missing for tenant id: ${id}`);
      throw new Error('Tenant subscription not found');
    }
    logger.info(`✅ Tenant and subscription loaded: ${tenant.subscription.status}`);
  } catch (err) {
    logger.error(`❌ Error fetching tenant or subscription: ${err.message}`, err);
    throw new Error('Failed to load tenant or subscription');
  }
  let paymentURL = tenant.subscription?.paymentURL;

  // Check if trial is still ongoing and paymentURL needs to be refreshed
  if (tenant.subscription?.status === 'trialing' /* && user.role === 'owner' */) {
    logger.info('🔁 Subscription is trialing');
    const now = new Date();
    const updatedAt = new Date(tenant.subscription.updatedAt);
    const isExpired = now - updatedAt > 24 * 60 * 60 * 1000;

    let hasPaymentMethod;
    try {
      hasPaymentMethod = await subscriptionService.hasPaymentMethod(tenant.subscription.customerId);
      logger.info(`💳 hasPaymentMethod: ${hasPaymentMethod}`);
    } catch (err) {
      logger.error('❌ Error checking payment method:', err);
      throw new Error('Payment method check failed');
    }

    if (!hasPaymentMethod && (!paymentURL || isExpired)) {
      logger.warn('⚠️ Generating new checkout session');
      try {
        const URL = await subscriptionService.regenerateCheckoutSession(
          tenant.subscription.customerId,
          tenant.subscription.stripeSubscriptionId,
          tenant.id.toString(),
          tenant.subscription.currency || 'cad'
        );
        logger.info(`✅ New checkout session URL: ${URL}`);
        tenant.subscription.paymentURL = URL;
        await tenant.subscription.save();
      } catch (err) {
        logger.error('❌ Error creating checkout session:', err);
        throw new Error('Failed to regenerate checkout session');
      }

      //paymentURL = newSession.url;
    } else if (hasPaymentMethod) {
      logger.info('🔁 Generating customer portal URL since payment method exists');
      try {
        const URL = await subscriptionService.getCustomerPortalUrl(tenant.subscription.customerId);
        logger.info(`✅ Customer portal URL: ${URL}`);
        tenant.subscription.paymentURL = URL;
        tenant.subscription.status = 'payment attached';
        await tenant.subscription.save();
      } catch (err) {
        logger.error('❌ Error getting customer portal URL:', err);
        throw new Error('Failed to get customer portal URL');
      }
    } else {
      /* logger.warn('I am at else');
      // 💡 Generate Stripe Customer Portal URL
      const URL = await subscriptionService.getCustomerPortalUrl(tenant.subscription.customerId);
      logger.warn('URL at else', URL);
      tenant.subscription.paymentURL = URL;
      //tenant.subscription.status = 'paymentAdded'; // Optional: use another status like 'active' if it fits better
      await tenant.subscription.save(); */
    }
  } else {
    // 🔁 Not trialing
    logger.info('💼 Subscription is not trialing, generating portal URL');
    try {
      const URL = await subscriptionService.getCustomerPortalUrl(tenant.subscription.customerId);
      logger.info(`✅ Portal URL (non-trial): ${URL}`);
      tenant.subscription.paymentURL = URL;
      await tenant.subscription.save();
    } catch (err) {
      logger.error('❌ Error getting portal URL (non-trial):', err);
      throw new Error('Failed to get customer portal URL');
    }
  }
  logger.debug(`Tenant data: ${JSON.stringify(tenant, null, 2)}`);

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
