const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createJob = {
  body: Joi.object().keys({
    jobTitle: Joi.string().trim().optional().allow(''), // Job title is required
    jobDescription: Joi.string().trim().optional().allow(''), // Job description is required
    jobType: Joi.string().required(), // Job type is required
    reportedBy: Joi.string().custom(objectId).required(), // User who reported the job
    assignedTo: Joi.array().items(Joi.string().custom(objectId)).optional().allow(null), // List of assigned users
    status: Joi.string().required(), // Job status is required
    label: Joi.string().trim().optional().allow(''), // Optional label
    dueDate: Joi.date().required(), // Due date is required
    priority: Joi.string().valid('P1', 'P2', 'P3').required(), // Priority validation
    customer: Joi.string().custom(objectId).required(), // Customer ID is required
    siteLocationId: Joi.string().custom(objectId).required(), // Site location is required
    estimateId: Joi.string().optional().allow(''), // Estimate ID is optional
    invoiceId: Joi.string().optional().allow(''), // Invoice ID is optional
    comments: Joi.array()
      .items(
        Joi.object().keys({
          text: Joi.string().required(),
          createdBy: Joi.string().custom(objectId).required(),
        })
      )
      .optional(),
    hoursSpent: Joi.array()
      .items(
        Joi.object().keys({
          employeeId: Joi.string().custom(objectId).required(),
          hours: Joi.number().positive().required(),
          notes: Joi.string().required(),
        })
      )
      .optional(),
    images: Joi.array().items(Joi.string()).optional(), // Image URLs
    checklistID: Joi.string().optional().allow(''), // Checklist ID
    recurrence: Joi.object()
      .keys({
        type: Joi.string().valid('none', 'daily', 'weekly', 'monthly').default('none'),
        daysOfWeek: Joi.string().optional().allow(''),
        completedIterations: Joi.number().integer().min(0).optional(),
        totalIterations: Joi.number().integer().min(0).optional(),
        dueDates: Joi.array().items(Joi.date()).optional(),
      })
      .optional(),
  }),
};

const getJobs = {
  query: Joi.object().keys({
    customer: Joi.string().custom(objectId).optional(), // Customer filter
    siteLocation: Joi.string().custom(objectId).optional(), // Site location filter
    status: Joi.string().optional().allow(''), // Status filter
    jobType: Joi.string().optional().allow(''), // Job type filter
    label: Joi.string().trim().optional().allow(''), // Optional label
    assignedTo: Joi.string().custom(objectId).optional(), // Assigned user filter
    priority: Joi.string().valid('Low', 'Medium', 'High', 'Critical').optional(), // Priority filter
    searchText: Joi.string().optional(), // Search text filter
    sortBy: Joi.string().optional(), // Sorting field
    limit: Joi.number().integer().optional(), // Pagination limit
    page: Joi.number().integer().optional(), // Pagination page
  }),
};

const getJob = {
  params: Joi.object().keys({
    jobId: Joi.string().custom(objectId).required(), // Job ID is required
  }),
};

const updateJob = {
  params: Joi.object().keys({
    jobId: Joi.string().custom(objectId).required(), // Job ID is required
  }),
  body: Joi.object()
    .keys({
      jobTitle: Joi.string().trim().optional(),
      jobDescription: Joi.string().trim().optional(),
      jobType: Joi.string().optional(),
      reportedBy: Joi.string().custom(objectId).optional(),
      assignedTo: Joi.array().items(Joi.string().custom(objectId)).optional(),
      status: Joi.string().optional(),
      label: Joi.string().trim().optional(),
      dueDate: Joi.date().optional(),
      priority: Joi.string().valid('Low', 'Medium', 'High', 'Critical').optional(),
      customer: Joi.string().custom(objectId).optional(),
      siteLocation: Joi.string().custom(objectId).optional(),
      estimateId: Joi.string().optional(),
      invoiceId: Joi.string().optional(),
      comments: Joi.array()
        .items(
          Joi.object().keys({
            text: Joi.string().required(),
            createdBy: Joi.string().custom(objectId).required(),
          })
        )
        .optional(),
      hoursSpent: Joi.array()
        .items(
          Joi.object().keys({
            employeeId: Joi.string().custom(objectId).required(),
            hours: Joi.number().positive().required(),
            notes: Joi.string().required(),
          })
        )
        .optional(),
      images: Joi.array().items(Joi.string()).optional(),
      checklistID: Joi.string().optional(),
      recurrence: Joi.object()
        .keys({
          type: Joi.string().valid('none', 'daily', 'weekly', 'monthly').optional(),
          daysOfWeek: Joi.string().optional(),
          completedIterations: Joi.number().integer().min(0).optional(),
          totalIterations: Joi.number().integer().min(0).optional(),
          dueDates: Joi.array().items(Joi.date()).optional(),
        })
        .optional(),
    })
    .min(1), // Ensure at least one field is updated
};

const deleteJob = {
  params: Joi.object().keys({
    jobId: Joi.string().custom(objectId).required(), // Job ID is required
  }),
};

const updateJobStatus = {
  params: Joi.object().keys({
    jobId: Joi.string().custom(objectId).required(), // Job ID is required
  }),
  body: Joi.object().keys({
    status: Joi.string().required(),
    comment: Joi.string().optional(),
  }),
};

const getJobsByCustomer = {
  params: Joi.object().keys({
    customerId: Joi.string().custom(objectId).required(), // Customer ID is required
  }),
  query: Joi.object().keys({
    status: Joi.string().optional(),
    sortBy: Joi.string().optional(),
    limit: Joi.number().integer().optional(),
    page: Joi.number().integer().optional(),
  }),
};

const addCommentToJob = {
  params: Joi.object().keys({
    jobId: Joi.string().custom(objectId).required(), // Job ID
  }),
  body: Joi.object().keys({
    text: Joi.string().required(),
    createdBy: Joi.string().custom(objectId).required(),
  }),
};

const removeCommentFromJob = {
  params: Joi.object().keys({
    jobId: Joi.string().custom(objectId).required(), // Job ID
    commentId: Joi.string().custom(objectId).required(), // Comment ID
  }),
};

const addHoursToJob = {
  params: Joi.object().keys({
    jobId: Joi.string().custom(objectId).required(), // Job ID
  }),
  body: Joi.object().keys({
    employeeId: Joi.string().custom(objectId).required(),
    hours: Joi.number().positive().required(),
    notes: Joi.string().required(),
  }),
};

const removeHoursFromJob = {
  params: Joi.object().keys({
    jobId: Joi.string().custom(objectId).required(), // Job ID
    hoursId: Joi.string().custom(objectId).required(), // Hours entry ID
  }),
};

const updateJobType = {
  params: Joi.object().keys({
    jobId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    jobType: Joi.string().required(),
  }),
};

const updateJobPriority = {
  params: Joi.object().keys({
    jobId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    priority: Joi.string().valid('Low', 'Medium', 'High', 'Critical').required(),
  }),
};

const assignUserToJob = {
  params: Joi.object().keys({
    jobId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
  }),
};

const deleteUserFromJob = {
  params: Joi.object().keys({
    jobId: Joi.string().custom(objectId).required(),
    userId: Joi.string().custom(objectId).required(),
  }),
};

const addCustomerToJob = {
  params: Joi.object().keys({
    jobId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    customerId: Joi.string().custom(objectId).required(),
  }),
};

const deleteCustomerFromJob = {
  params: Joi.object().keys({
    jobId: Joi.string().custom(objectId).required(),
  }),
};

const addSiteToJob = {
  params: Joi.object().keys({
    jobId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    siteLocationId: Joi.string().custom(objectId).required(),
  }),
};

const deleteSiteFromJob = {
  params: Joi.object().keys({
    jobId: Joi.string().custom(objectId).required(),
  }),
};

const updateJobDueDate = {
  params: Joi.object().keys({
    jobId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    dueDate: Joi.date().required(),
  }),
};

const addChecklistToJob = {
  params: Joi.object().keys({
    jobId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    checklistID: Joi.string().required(),
  }),
};

const deleteChecklistFromJob = {
  params: Joi.object().keys({
    jobId: Joi.string().custom(objectId).required(),
  }),
};

const updateJobRecurrence = {
  params: Joi.object().keys({
    jobId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    type: Joi.string().valid('none', 'daily', 'weekly', 'monthly').required(),
    daysOfWeek: Joi.string().optional(),
    completedIterations: Joi.number().integer().min(0).optional(),
    totalIterations: Joi.number().integer().min(0).optional(),
    dueDates: Joi.array().items(Joi.date()).optional(),
  }),
};

const addImageToJob = {
  params: Joi.object().keys({
    jobId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    imageUrl: Joi.string().uri().required(),
  }),
};

const deleteImageFromJob = {
  params: Joi.object().keys({
    jobId: Joi.string().custom(objectId).required(),
    imageId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  createJob,
  getJobs,
  getJob,
  updateJob,
  deleteJob,
  updateJobStatus,
  getJobsByCustomer,
  addCommentToJob,
  removeCommentFromJob,
  addHoursToJob,
  removeHoursFromJob,
  updateJobType,
  updateJobPriority,
  assignUserToJob,
  deleteUserFromJob,
  addCustomerToJob,
  deleteCustomerFromJob,
  addSiteToJob,
  deleteSiteFromJob,
  updateJobDueDate,
  addChecklistToJob,
  deleteChecklistFromJob,
  updateJobRecurrence,
  addImageToJob,
  deleteImageFromJob,
};
