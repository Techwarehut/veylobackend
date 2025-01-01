const Joi = require('joi');
const { password, objectId } = require('./custom.validation');

const createUser = {
  body: Joi.object().keys({
    email: Joi.string().email().required(), // Email is required and must be a valid email

    name: Joi.string().required(), // Name can be an empty string or null (optional)
    role: Joi.string().valid('member', 'lead').required(), // Role is optional, but must be one of these
    phone: Joi.string().allow('', null).optional(), // Phone can be empty or null
    profileUrl: Joi.string().allow('', null).optional(),

    emergencyContact: Joi.object({
      ename: Joi.string().allow('', null).optional(), // Emergency name can be empty or null
      ephone: Joi.string().allow('', null).optional(), // Emergency phone can be empty or null
    }).optional(), // Emergency contact is optional
  }),
};

const getUsers = {
  query: Joi.object().keys({
    tenantId: Joi.string().optional(), // Add tenantId as a required string
    name: Joi.string(),
    role: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const updateUser = {
  params: Joi.object().keys({
    userId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      email: Joi.string().email().required(), // Email is required and must be a valid email

      name: Joi.string().allow('', null).optional(), // Name can be an empty string or null (optional)
      role: Joi.string().valid('member', 'owner', 'lead').required(), // Role is optional, but must be one of these
      phone: Joi.string().allow('', null).optional(), // Phone can be empty or null
      profileUrl: Joi.string().allow('', null).optional(),
      emergencyContact: Joi.object({
        ename: Joi.string().allow('', null).optional(), // Emergency name can be empty or null
        ephone: Joi.string().allow('', null).optional(), // Emergency phone can be empty or null
      }).optional(), // Emergency contact is optional
    })
    .min(1),
};

const deleteUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
};
