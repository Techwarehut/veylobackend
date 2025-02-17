const Joi = require('joi');
const { objectId } = require('./custom.validation');

// Add job type validation
const addJobType = {
  body: Joi.object().keys({
    jobType: Joi.string().required(), // Job Type to add is required
  }),
};

// Delete job type validation
const deleteJobType = {
  body: Joi.object().keys({
    jobType: Joi.string().required(), // Job Type to delete is required
  }),
};

module.exports = {
  addJobType,
  deleteJobType,
};
