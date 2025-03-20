const httpStatus = require('http-status');
const { Job } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a job
 */
const createJob = async (jobBody) => {
  return Job.create(jobBody);
};

/**
 * Get all jobs
 */
const getJobs = async (filter, options) => {
  return Job.paginate(filter, options);
};

/**
 * Get job by ID
 */
const getJobById = async (jobId) => {
  const job = await Job.findById(jobId);
  if (!job) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Job not found');
  }
  return job;
};

/**
 * Update job by ID
 */
const updateJobById = async (jobId, updateBody) => {
  const job = await getJobById(jobId);
  Object.assign(job, updateBody);
  await job.save();
  return job;
};

/**
 * Delete job by ID
 */
const deleteJobById = async (jobId) => {
  const job = await getJobById(jobId);
  await job.remove();
  return job;
};

/**
 * Update job status
 */
const updateJobStatus = async (jobId, status) => {
  return updateJobById(jobId, { status });
};

const updateJobType = async (jobId, jobType) => {
  return updateJobById(jobId, { jobType });
};

const updateJobPriority = async (jobId, priority) => {
  return updateJobById(jobId, { priority });
};

const addCustomerToJob = async (jobId, customer) => {
  return updateJobById(jobId, { customer });
};

const deleteCustomerFromJob = async (jobId) => {
  return updateJobById(jobId, { customer: null });
};

const addSiteToJob = async (jobId, siteLocationId) => {
  return updateJobById(jobId, { siteLocationId });
};

const deleteSiteFromJob = async (jobId) => {
  return updateJobById(jobId, { siteLocationId: null });
};
const updateJobDueDate = async (jobId, dueDate) => {
  return updateJobById(jobId, { dueDate });
};

/**
 * Get jobs by customer ID
 */
const getJobsByCustomer = async (customerId) => {
  return Job.find({ customer: customerId });
};

/**
 * Add or remove comment from a job
 */
const addCommentToJob = async (jobId, comment) => {
  const job = await getJobById(jobId);
  job.comments.push(comment);
  await job.save();
  return job;
};

const removeCommentFromJob = async (jobId, commentId) => {
  const job = await getJobById(jobId);
  job.comments = job.comments.filter((c) => c._id.toString() !== commentId);
  await job.save();
  return job;
};

/**
 * Assign user to job
 */
const assignUserToJob = async (jobId, userId) => {
  return updateJobById(jobId, { assignedTo: userId });
};

/**
 * Remove user from job
 */
const deleteUserFromJob = async (jobId) => {
  return updateJobById(jobId, { assignedTo: null });
};

module.exports = {
  createJob,
  getJobs,
  getJobById,
  updateJobById,
  deleteJobById,
  updateJobStatus,
  getJobsByCustomer,
  addCommentToJob,
  removeCommentFromJob,
  assignUserToJob,
  deleteUserFromJob,
  updateJobType,
  updateJobPriority,
  updateJobDueDate,
  addCustomerToJob,
  deleteCustomerFromJob,
  addSiteToJob,
  deleteSiteFromJob,
};
