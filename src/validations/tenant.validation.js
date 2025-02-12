const Joi = require('joi');
const { objectId } = require('./custom.validation');

const getTenant = {};

const updateTenant = {
  body: Joi.object()
    .keys({
      businessName: Joi.string().trim().allow('', null).optional(),
      // businessLogo: Joi.string().uri().allow('', null).optional(),
      businessType: Joi.string().allow('', null).optional(),
      businessPhone: Joi.string().allow('', null).optional(),
      businessEmail: Joi.string().email().allow('', null).optional(),
      businessWebsite: Joi.string().allow('', null).optional(),
      businessBillingAddress: Joi.object({
        addressLine: Joi.string().allow('', null).optional(),
        city: Joi.string().allow('', null).optional(),
        zipCode: Joi.string().allow('', null).optional(),
        province: Joi.string().allow('', null).optional(),
        country: Joi.string().allow('', null).optional(),
      }).optional(),
      businessTaxID: Joi.string().allow('', null).optional(),
      taxRate: Joi.number().allow('', null).optional(),
      employeeCount: Joi.number().optional(),
      customerNotificationPreferences: Joi.object({
        email: Joi.boolean().optional(),
        sms: Joi.boolean().optional(),
      }).optional(),
      currency: Joi.string().optional(),
      // subscription: Joi.string().custom(objectId).optional(),
      //checklists: Joi.array().items(Joi.string().custom(objectId)).optional(),
    })
    .min(1),
};

module.exports = {
  getTenant,
  updateTenant,
};
