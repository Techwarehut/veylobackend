const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { jobtypesService } = require('../services');

/**
 * Get all job types for a specific tenant
 * @param {Object} req
 * @param {Object} res
 * @returns {Promise<void>}
 */
const getJobTypes = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantID;

  if (!tenantId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Tenant ID is required');
  }

  const jobTypes = await jobtypesService.getJobTypeByTenantId(tenantId);

  if (!jobTypes) {
    res.status(httpStatus.NO_CONTENT).send(); // Return 204 No Content if no job types found.
  } else {
    res.status(httpStatus.OK).send(jobTypes); // Return job types found for the tenant.
  }
});

// Add a new job type to the array
const addJobType = catchAsync(async (req, res) => {
  const { jobType } = req.body;

  const updatedJobType = await jobtypesService.addJobType(req.user.tenantID, jobType);

  if (!updatedJobType) {
    throw new ApiError(httpStatus.NOT_FOUND, 'JobType not found');
  }

  res.status(httpStatus.OK).send(updatedJobType);
});

// Delete a job type from the array
const deleteJobType = catchAsync(async (req, res) => {
  const { jobType } = req.body;

  const updatedJobType = await jobtypesService.deleteJobType(req.user.tenantID, jobType);

  if (!updatedJobType) {
    throw new ApiError(httpStatus.NOT_FOUND, 'JobType not found');
  }

  res.status(httpStatus.OK).send(updatedJobType);
});

module.exports = {
  getJobTypes,
  addJobType,
  deleteJobType,
};
