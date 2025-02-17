const httpStatus = require('http-status');
const { JobTypes } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a new job type document
 * @param {Object} jobTypeBody
 * @returns {Promise<JobType>}
 */
const createJobType = async (jobTypeBody) => {
  return JobTypes.create(jobTypeBody);
};

/**
 * Query for job types with optional filter and pagination
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryJobTypes = async (filter, options) => {
  const jobTypes = await JobTypes.paginate(filter, options);
  return jobTypes;
};

/**
 * Get job type by tenantId
 * @param {ObjectId} tenantId
 * @returns {Promise<JobType>}
 */
const getJobTypeByTenantId = async (tenantId) => {
  try {
    console.log('tenantId:', tenantId);
    const jobType = await JobTypes.findOne({ tenantId }).exec(); // Adding .exec() ensures proper promise handling
    if (!jobType) {
      throw new Error('JobType not found for this tenant');
    }
    return jobType;
  } catch (error) {
    console.error('Error in getJobTypeByTenantId:', error);
    throw error;
  }
};

/**
 * Add a job type to the jobTypes array
 * @param {ObjectId} tenantId
 * @param {String} jobType
 * @returns {Promise<JobTypes>}
 */
const addJobType = async (tenantId, jobType) => {
  const jobTypeDocument = await getJobTypeByTenantId(tenantId);
  if (!jobTypeDocument) {
    throw new ApiError(httpStatus.NOT_FOUND, 'JobType document not found for tenant');
  }
  if (jobTypeDocument.job_types.includes(jobType)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Job type already exists');
  }
  jobTypeDocument.job_types.push(jobType);
  await jobTypeDocument.save();
  return jobTypeDocument;
};

/**
 * Delete a job type from the jobTypes array
 * @param {ObjectId} tenantId
 * @param {String} jobType
 * @returns {Promise<JobTypes>}
 */
const deleteJobType = async (tenantId, jobType) => {
  const jobTypeDocument = await getJobTypeByTenantId(tenantId);
  if (!jobTypeDocument) {
    throw new ApiError(httpStatus.NOT_FOUND, 'JobType document not found for tenant');
  }
  if (!jobTypeDocument.job_types.includes(jobType)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Job type does not exist');
  }
  jobTypeDocument.job_types = jobTypeDocument.job_types.filter((type) => type !== jobType);
  await jobTypeDocument.save();
  return jobTypeDocument;
};

/**
 * Update job types for a specific tenant (overwrites the current set)
 * @param {ObjectId} tenantId
 * @param {Array<String>} jobTypes
 * @returns {Promise<JobTypes>}
 */
const updateJobTypes = async (tenantId, jobTypes) => {
  const jobTypeDocument = await getJobTypeByTenantId(tenantId);
  if (!jobTypeDocument) {
    throw new ApiError(httpStatus.NOT_FOUND, 'JobType document not found for tenant');
  }
  jobTypeDocument.job_types = jobTypes;
  await jobTypeDocument.save();
  return jobTypeDocument;
};

/**
 * Create default job types for the new tenant
 * @param {ObjectId} tenantId - The tenant ID
 * @param {Array} defaultJobTypes - Default job types for the tenant
 * @returns {Promise<JobTypes>}
 */
const createDefaultJobTypesForTenant = async (tenantId, defaultJobTypes) => {
  const jobType = await JobTypes.create({
    tenantId,
    job_types: defaultJobTypes,
  });

  return jobType;
};

module.exports = {
  createJobType,
  queryJobTypes,
  getJobTypeByTenantId,
  addJobType,
  deleteJobType,
  updateJobTypes,
  createDefaultJobTypesForTenant,
};
