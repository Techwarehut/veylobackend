const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createCustomer = {
  body: Joi.object().keys({
    customerName: Joi.string().required(), // Customer name is required
    businessName: Joi.string().required(), // Business name is required
    email: Joi.string().email().required(), // Email is required and must be valid
    phone: Joi.string().allow('', null).optional(), // Phone is optional
    website: Joi.string().allow('', null).optional(), // Website URL is optional
    billingAddress: Joi.object()
      .keys({
        AddressLine: Joi.string().allow('', null).optional(),
        City: Joi.string().allow('', null).optional(),
        Province: Joi.string().allow('', null).optional(),
        zipcode: Joi.string().allow('', null).optional(),
      })
      .optional(), // Billing address is optional
    siteLocations: Joi.array()
      .items(
        Joi.object().keys({
          siteName: Joi.string().allow('', null).optional(),
          siteContactPerson: Joi.string().allow('', null).optional(),
          siteContactPhone: Joi.string().allow('', null).optional(),
          AddressLine: Joi.string().allow('', null).optional(),
          City: Joi.string().allow('', null).optional(),
          Province: Joi.string().allow('', null).optional(),
          zipcode: Joi.string().allow('', null).optional(),
        })
      )
      .optional(), // Site locations are optional
    isActive: Joi.boolean().optional(), // Active status is optional
  }),
};

const getCustomers = {
  query: Joi.object().keys({
    // tenantId: Joi.string().custom(objectId).optional(), // Tenant ID is optional
    customerName: Joi.string().optional(), // Filter by customer name
    businessName: Joi.string().optional(), // Filter by business name
    isActive: Joi.boolean().optional(), // Filter by active status
    sortBy: Joi.string().optional(), // Sorting field
    limit: Joi.number().integer().optional(), // Pagination limit
    page: Joi.number().integer().optional(), // Pagination page
  }),
};

const getCustomer = {
  params: Joi.object().keys({
    customerId: Joi.string().custom(objectId).required(), // Customer ID is required
  }),
};

const updateCustomer = {
  params: Joi.object().keys({
    customerId: Joi.string().custom(objectId).required(), // Customer ID is required
  }),
  body: Joi.object()
    .keys({
      customerName: Joi.string().optional(), // Customer name is optional
      businessName: Joi.string().optional(), // Business name is optional
      email: Joi.string().email().optional(), // Email must be valid if provided
      phone: Joi.string().allow('', null).optional(), // Phone can be empty or null
      website: Joi.string().allow('', null).optional(), // Website URL is optional
      billingAddress: Joi.object()
        .keys({
          AddressLine: Joi.string().allow('', null).optional(),
          City: Joi.string().allow('', null).optional(),
          Province: Joi.string().allow('', null).optional(),
          zipcode: Joi.string().allow('', null).optional(),
        })
        .optional(), // Billing address is optional
      siteLocations: Joi.array()
        .items(
          Joi.object().keys({
            _id: Joi.string().optional(),
            siteName: Joi.string().allow('', null).optional(),
            siteContactPerson: Joi.string().allow('', null).optional(),
            siteContactPhone: Joi.string().allow('', null).optional(),
            AddressLine: Joi.string().allow('', null).optional(),
            City: Joi.string().allow('', null).optional(),
            Province: Joi.string().allow('', null).optional(),
            zipcode: Joi.string().allow('', null).optional(),
          })
        )
        .optional(), // Site locations are optional
      isActive: Joi.boolean().optional(), // Active status is optional
    })
    .min(1), // Ensure at least one field is updated
};

const deleteCustomer = {
  params: Joi.object().keys({
    customerId: Joi.string().custom(objectId).required(), // Customer ID is required
  }),
};

const activateCustomer = {
  params: Joi.object().keys({
    customerId: Joi.string().custom(objectId).required(), // Customer ID is required
  }),
};

const deactivateCustomer = {
  params: Joi.object().keys({
    customerId: Joi.string().custom(objectId).required(), // Customer ID is required
  }),
};

// New validation for fetching site locations
const getSiteLocations = {
  params: Joi.object().keys({
    customerId: Joi.string().custom(objectId).required(), // Customer ID is required
  }),
};

// New validation for adding a site location
const addSiteLocation = {
  params: Joi.object().keys({
    customerId: Joi.string().custom(objectId).required(), // Customer ID is required
  }),
  body: Joi.object().keys({
    siteName: Joi.string().allow('', null).optional(),
    siteContactPerson: Joi.string().allow('', null).optional(),
    siteContactPhone: Joi.string().allow('', null).optional(),
    AddressLine: Joi.string().allow('', null).optional(),
    City: Joi.string().allow('', null).optional(),
    Province: Joi.string().allow('', null).optional(),
    zipcode: Joi.string().allow('', null).optional(),
  }),
};

const deleteSiteLocation = {
  params: Joi.object().keys({
    customerId: Joi.string().custom(objectId).required(), // Customer ID is required
    siteLocationId: Joi.string().custom(objectId).required(), // Site Location ID is required
  }),
};

const updateSiteLocation = {
  params: Joi.object().keys({
    customerId: Joi.string().custom(objectId).required(), // Customer ID is required
    siteLocationId: Joi.string().custom(objectId).required(), // Site Location ID is required
  }),
  body: Joi.object()
    .keys({
      siteName: Joi.string().allow('', null).optional(),
      siteContactPerson: Joi.string().allow('', null).optional(),
      siteContactPhone: Joi.string().allow('', null).optional(),
      AddressLine: Joi.string().allow('', null).optional(),
      City: Joi.string().allow('', null).optional(),
      Province: Joi.string().allow('', null).optional(),
      zipcode: Joi.string().allow('', null).optional(),
    })
    .min(1), // Ensure at least one field is updated
};

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
