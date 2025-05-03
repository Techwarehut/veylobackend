const httpStatus = require('http-status');
const { Job } = require('../models');
const ApiError = require('../utils/ApiError');
const { getChecklistById } = require('./checklist.service');
const moment = require('moment');
const mongoose = require('mongoose');
const { customerService } = require('../services');

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

const addImageToJob = async (jobId, imageUrls) => {
  try {
    const job = await getJobById(jobId);

    if (!job) {
      throw new Error('Job not found.');
    }

    job.images = [...(job.images || []), ...imageUrls];
    await job.save();

    return job;
  } catch (error) {
    throw new Error('Error updating images');
  }
};

const deleteImageFromJob = async (jobId, imageUrl) => {
  try {
    const job = await getJobById(jobId);

    if (!job) {
      throw new Error('Job not found.');
    }

    // Now, delete the image from storage (e.g., from S3 or local filesystem)
    /* const isImageDeleted = await S3Service.deleteImage(imageUrl); // Assuming you have a service for S3 image deletion

    if (!isImageDeleted) {
      return res.status(500).json({ message: 'Failed to delete image from storage' });
    } */

    // Remove the imageUrl from the job.images array
    job.images = job.images.filter((image) => image !== imageUrl);
    await job.save();

    return job;
  } catch (error) {
    throw new Error('Error updating images');
  }
};

const getJobsForCalendar = async (tenantId, selectedDate, role, userId) => {
  // Ensure tenantId is converted to ObjectId if it's not already
  const tenantObjectId = mongoose.Types.ObjectId(tenantId);

  // Ensure selectedDate is in a valid format (ISO 8601)
  const formattedSelectedDate = moment(selectedDate, 'YYYY-MM-DD', true).isValid()
    ? moment(selectedDate).startOf('day')
    : null;

  if (!formattedSelectedDate) {
    throw new Error('Invalid selectedDate format');
  }

  // Calculate the range (selected date + 2 days)
  const startDate = formattedSelectedDate; // Start of the selected date
  const endDate = formattedSelectedDate.clone().add(7, 'days').endOf('day'); // End of the selected date + 2 days

  const now = moment().startOf('day');
  const isToday = formattedSelectedDate.isSame(now, 'day');

  let filter = {
    tenantId: tenantObjectId,
  };

  if (isToday) {
    // Get all past due jobs and those within the next 2 days
    filter.dueDate = { $lte: endDate.toDate() };
  } else {
    // Only get jobs within the selected 3-day window
    filter.dueDate = {
      $gte: formattedSelectedDate.toDate(),
      $lte: endDate.toDate(),
    };
  }

  // Build base filter
  /* const filter = {
    tenantId: tenantObjectId,
    dueDate: { $gte: startDate.toDate(), $lte: endDate.toDate() },
  }; */
  /* const filter = {
    tenantId: tenantObjectId,
    dueDate: { $lte: endDate.toDate() }, // include everything up to endDate
  }; */

  // Add filter to ensure only jobs assigned to the user are returned if member
  if (role === 'member') {
    filter.assignedTo = userId;
    filter.status = { $in: ['Backlog', 'In Progress', 'On Hold'] };
  } else {
    filter.status = { $in: ['Backlog', 'In Progress', 'On Hold', 'Approval Pending'] };
  }

  // Query for jobs that have a dueDate within the range (selected date + 2 days)
  /* let jobs = await Job.find({
    tenantId: tenantObjectId,
    dueDate: { $gte: startDate.toDate(), $lte: endDate.toDate() },
  }); */
  let jobs = await Job.find(filter).sort('dueDate priority -createdAt');

  jobs = await Job.populate(jobs, [
    { path: 'reportedBy', select: 'id name profileUrl' },
    { path: 'assignedTo', select: 'id name profileUrl' },
    { path: 'customer', select: 'id  businessName' },
  ]);

  for (const job of jobs) {
    if (job.customer && job.siteLocationId) {
      const customerDetails = await customerService.getCustomerById(job.customer._id);

      const matchingSiteLocation = customerDetails?.siteLocations?.find(
        (location) => location._id.toString() === job.siteLocationId.toString()
      );

      // Assign detailed data to the new field
      job.siteLocation = matchingSiteLocation || null;
    }
  }

  // Now, ensure that at least one job exists for every day in the month for the selected date
  /*  const monthStart = formattedSelectedDate.clone().startOf('month'); // Start of the selected month
  const monthEnd = formattedSelectedDate.clone().endOf('month'); // End of the selected month

  let daysWithJobs = []; */

  // Loop through the entire month and ensure there's at least one job for each day
  /*  for (let date = monthStart; date.isBefore(monthEnd); date.add(1, 'day')) {
    const dayJobs = await Job.find({
      tenantId: tenantObjectId,
      dueDate: { $gte: date.startOf('day').toDate(), $lte: date.endOf('day').toDate() },
    });

    daysWithJobs.push({
      date: date.format('YYYY-MM-DD'),
      hasJob: dayJobs.length > 0,
    });
  } */

  // Transform the jobs into a format that Agenda expects (grouped by date)
  const items = {};

  // Iterate over the jobs and group them by their due date
  /* jobs.forEach((job) => {
    const dueDate = moment(job.dueDate).format('YYYY-MM-DD'); // Format the dueDate as YYYY-MM-DD

    if (!items[dueDate]) {
      items[dueDate] = [];
    }

    items[dueDate].push({
      id: job.id, // You can use job id or job number
      jobNumber: job.jobNumber, // You can use job id or job number
      jobTitle: job.jobTitle,
      dueDate: job.dueDate, // Include full date if necessary
      jobDescription: job.jobDescription,
      priority: job.priority,
      jobType: job.jobType,
      assignedTo: job.assignedTo,
      status: job.status,
      customer: job.customer,
      siteLocation: job.siteLocation,
    });
  }); */
  jobs.forEach((job) => {
    const jobDue = moment(job.dueDate);
    const dueDate = jobDue.isSameOrBefore(startDate, 'day') ? startDate.format('YYYY-MM-DD') : jobDue.format('YYYY-MM-DD');

    if (!items[dueDate]) {
      items[dueDate] = [];
    }

    items[dueDate].push({
      id: job.id,
      jobNumber: job.jobNumber,
      jobTitle: job.jobTitle,
      dueDate: job.dueDate,
      jobDescription: job.jobDescription,
      priority: job.priority,
      jobType: job.jobType,
      assignedTo: job.assignedTo,
      status: job.status,
      customer: job.customer,
      siteLocation: job.siteLocation,
    });
  });

  /*  // Ensure that there are empty arrays for dates where there are no jobs
  daysWithJobs.forEach((day) => {
    if (day.hasJob && !items[day.date]) {
      items[day.date] = []; // Ensure the day exists in the items, even if no jobs
    }
  }); */

  return {
    items,
    // daysWithJobs,
  };
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
  addImageToJob,
  deleteImageFromJob,
  getJobsForCalendar,
};
