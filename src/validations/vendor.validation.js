const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createVendor = {
  body: Joi.object().keys({
    companyName: Joi.string().required(), // Vendor's company name is required
    contactPerson: Joi.object()
      .keys({
        name: Joi.string().allow('', null).optional(), // Contact person name is required
        title: Joi.string().allow('', null).optional(), // Job title is optional
        email: Joi.string().email().allow('', null).optional(), // Email is required and must be valid
        phone: Joi.string().allow('', null).optional(), // Phone is optional
      })
      .required(), // Contact person details are required
    address: Joi.object()
      .keys({
        AddressLine: Joi.string().allow('', null).optional(), // Address line is required
        City: Joi.string().allow('', null).optional(), // City is required
        Province: Joi.string().allow('', null).optional(), // Province is required
        zipcode: Joi.string().allow('', null).optional(), // Zipcode is required
      })
      .required(), // Address details are required
    isActive: Joi.boolean().optional(), // Active status is optional
  }),
};

const getVendors = {
  query: Joi.object().keys({
    tenantId: Joi.string().custom(objectId).optional(), // Tenant ID is optional
    companyName: Joi.string().optional(), // Filter by company name
    isActive: Joi.boolean().optional(), // Filter by active status
    sortBy: Joi.string().optional(), // Sorting field
    limit: Joi.number().integer().optional(), // Pagination limit
    page: Joi.number().integer().optional(), // Pagination page
  }),
};

const getVendor = {
  params: Joi.object().keys({
    vendorId: Joi.string().custom(objectId).required(), // Vendor ID is required
  }),
};

const updateVendor = {
  params: Joi.object().keys({
    vendorId: Joi.string().custom(objectId).required(), // Vendor ID is required
  }),
  body: Joi.object()
    .keys({
      companyName: Joi.string().optional(), // Company name is optional
      contactPerson: Joi.object()
        .keys({
          name: Joi.string().allow('', null).optional(), // Contact person name is optional
          title: Joi.string().allow('', null).optional(), // Job title is optional
          email: Joi.string().allow('', null).email().optional(), // Email must be valid if provided
          phone: Joi.string().allow('', null).allow('', null).optional(), // Phone is optional
        })
        .optional(), // Contact person details are optional
      address: Joi.object()
        .keys({
          AddressLine: Joi.string().allow('', null).optional(),
          City: Joi.string().allow('', null).optional(),
          Province: Joi.string().allow('', null).optional(),
          zipcode: Joi.string().allow('', null).optional(),
        })
        .optional(), // Address details are optional
      isActive: Joi.boolean().optional(), // Active status is optional
    })
    .min(1), // Ensure at least one field is updated
};

const deleteVendor = {
  params: Joi.object().keys({
    vendorId: Joi.string().custom(objectId).required(), // Vendor ID is required
  }),
};

const activateVendor = {
  params: Joi.object().keys({
    vendorId: Joi.string().custom(objectId).required(), // Vendor ID is required
  }),
};

const deactivateVendor = {
  params: Joi.object().keys({
    vendorId: Joi.string().custom(objectId).required(), // Vendor ID is required
  }),
};

module.exports = {
  createVendor,
  getVendors,
  getVendor,
  updateVendor,
  deleteVendor,
  activateVendor,
  deactivateVendor,
};
