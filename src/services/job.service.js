const httpStatus = require('http-status');
const { Job } = require('../models');
const ApiError = require('../utils/ApiError');
const { getChecklistById } = require('./checklist.service');

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
  const job = await getJobById(jobId);

  // Check if the user is already assigned
  if (job.assignedTo.includes(userId)) {
    throw new Error('User is already assigned to this job.');
  }

  job.assignedTo.push(userId);

  // Initialize hoursSpent for the new user
  job.hoursSpent.push({
    employeeId: userId,
    hours: 0,
    notes: '', // Empty notes initially
  });

  await job.save();
  return job;
};

/**
 * Remove user from job
 */
const deleteUserFromJob = async (jobId, userId) => {
  const job = await getJobById(jobId);

  if (!job) {
    throw new Error('Job not found.');
  }

  // Remove user from assignedTo array
  job.assignedTo = job.assignedTo.filter((id) => id.toString() !== userId.toString());

  // Remove user's hoursSpent entry
  job.hoursSpent = job.hoursSpent.filter((entry) => entry.employeeId.toString() !== userId.toString());

  await job.save();
  return job;
};

const addHoursToJob = async (jobId, userId, hours, notes = '') => {
  const job = await getJobById(jobId);

  if (!job) {
    throw new Error('Job not found.');
  }

  // Find the user's hoursSpent entry
  const userEntry = job.hoursSpent.find((entry) => entry.employeeId.toString() === userId.toString());

  if (!userEntry) {
    throw new Error('User is not assigned to this job.');
  }

  // replace hours to existing entry
  userEntry.hours = hours;
  if (notes) userEntry.notes = notes;

  await job.save();
  return job;
};

const addChecklistToJob = async (jobId, checklistID) => {
  const checklist = await getChecklistById(checklistID);
  if (!checklist) {
    throw new Error('Checklist not found');
  }

  // Prepare checklist data to store in the Job
  const checklistData = {
    checklistId: checklist._id,
    checklist_name: checklist.checklist_name,
    tasks: checklist.tasks.map((task) => ({
      task_name: task.task_name,
      status: 'pending', // Default status for all tasks
    })),
  };
  // Update the Job with the checklist
  return updateJobById(jobId, { checklist: checklistData });
};

const deleteChecklistFromJob = async (jobId) => {
  return updateJobById(jobId, { checklist: null });
};

const toggleTaskStatus = async (jobId, taskId) => {
  const job = await getJobById(jobId);

  if (!job) {
    throw new Error('Job not found.');
  }

  const task = job.checklist?.tasks.find((t) => t._id.toString() === taskId);
  if (!task) {
    throw new Error('Task not found.');
  }

  task.status = task.status === 'pending' ? 'completed' : 'pending';
  await job.save();

  return job;
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
  addHoursToJob,
  addChecklistToJob,
  deleteChecklistFromJob,
  toggleTaskStatus,
};
