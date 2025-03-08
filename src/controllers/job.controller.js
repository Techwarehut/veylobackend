const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { jobService, customerService } = require('../services');
const { Job } = require('../models');
const pick = require('../utils/pick');

const createJob = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantID;

  if (!tenantId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Tenant ID is required');
  }

  // Step 1: Find the highest jobNumber for the tenantId
  const lastJobNumber = await Job.findOne({ tenantId })
    .sort({ jobNumber: -1 }) // Sort in descending order
    .select('jobNumber') // Select only the field we need
    .lean(); // Use lean to avoid fetching full Mongoose objects

  // Step 2: Generate the next jobNumber
  let newJobNumber;
  if (lastJobNumber && lastJobNumber.jobNumber) {
    // Increment the last JobNumber by 1
    newJobNumber = String(parseInt(lastJobNumber.jobNumber) + 1).padStart(4, '0'); // Ensure it's zero-padded to 4 digits
  } else {
    // If no job exists, start with '0001'
    newJobNumber = '0001';
  }

  // Step 3: Add the new purchaseOrderNumber to the payload
  const jobData = {
    ...req.body,
    tenantId,
    jobNumber: newJobNumber,
    reportedBy: req.user.id,
  };
  const job = await jobService.createJob(jobData);
  res.status(httpStatus.CREATED).send(job);
});

const getJobs = catchAsync(async (req, res) => {
  const { searchText, status } = req.query;
  const filter = pick(req.query, ['assignedTo', 'label', 'customer', 'jobType', 'status']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  // Assuming the logged-in user's ID is stored in req.user
  const userId = req.user.id;
  filter.tenantId = req.user.tenantID;

  // Add filter to ensure only jobs assigned  to the user are returned
  if (req.user.role === 'member') filter.assignedTo = userId;

  if (!options.sortBy) {
    options.sortBy = 'dueDate priority -createdAt'; // Default sorting order
  }

  /* // Convert the sortBy string into a MongoDB sort object
    const sortFields = options.sortBy.split(' ');
    const sortObj = {};
  
    // Build the sort object for MongoDB
    sortFields.forEach(field => {
      if (field.startsWith('-')) {
        sortObj[field.slice(1)] = -1; // Sort descending (e.g., -createdAt)
      } else {
        sortObj[field] = 1; // Sort ascending (e.g., dueDate, priority)
      }
    });
  
    options.sortBy = sortObj; */

  options.limit = Math.min(parseInt(options.limit, 10) || 4, 10); // Cap limit to 100

  options.page = parseInt(options.page, 10) || 1; // Default page to 1

  // Handle multiple statuses (comma-separated values)
  if (status) {
    const statusArray = status.split(','); // Convert status string to an array
    filter.status = { $in: statusArray }; // Use $in operator for multiple statuses
  }

  // Add search logic if searchText exists
  if (searchText) {
    const searchRegex = new RegExp(searchText, 'i'); // Case-insensitive regex for search
    filter.$or = [
      { jobNumber: searchRegex },
      { jobTitle: searchRegex },
      { jobDescription: searchRegex },
      //{ 'vendor.companyName': searchRegex },
      // { jobID: searchRegex },
      { 'comments.text': searchRegex }, // Assuming `items` is an array with `itemName`
    ];
  }

  const result = await jobService.getJobs(filter, options);

  const populatedResult = await Job.populate(result.results, [
    //{ path: 'siteLocation', select: '_id siteContactPerson' },
    { path: 'reportedBy', select: 'id name profileUrl' },
    //{ path: 'approvedBy', select: 'id name profileUrl' },
    { path: 'customer', select: 'id  businessName' },
    // { path: 'jobID', select: 'jobTitle jobCode' },
  ]);

  // Step 2: Manually extract the correct `siteLocation` from the embedded array

  for (const job of populatedResult) {
    if (job.customer && job.siteLocation) {
      // Get customer details asynchronously
      const customerDetails = await customerService.getCustomerById(job.customer._id);
      console.log('Job siteLocation:', job.siteLocation);
      console.log('Customer details:', customerDetails);

      // Find the matching site location
      const matchingSiteLocation = customerDetails?.siteLocations.find(
        (location) => location._id.toString() === job.siteLocation.toString()
      );
      console.log('Matching siteLocation:', matchingSiteLocation);

      // Update the job's siteLocation with the matching siteLocation, or null if not found
      job.siteLocation = matchingSiteLocation || null;
    }
  }

  console.log('Updated populatedResult:', populatedResult);

  res.send({
    results: populatedResult,
    totalResults: result.totalResults,
    totalPages: result.totalPages,
    currentPage: options.page,
  });
});

const getJob = catchAsync(async (req, res) => {
  const job = await jobService.getJobById(req.params.jobNumber);
  res.send(job);
});

const updateJob = catchAsync(async (req, res) => {
  const job = await jobService.updateJobById(req.params.jobNumber, req.body);
  res.send(job);
});

const deleteJob = catchAsync(async (req, res) => {
  await jobService.deleteJobById(req.params.jobNumber);
  res.status(httpStatus.NO_CONTENT).send();
});

const updateJobStatus = catchAsync(async (req, res) => {
  const job = await jobService.updateJobStatus(req.params.jobNumber, req.body.status);
  res.send(job);
});

const getJobsByCustomer = catchAsync(async (req, res) => {
  const jobs = await jobService.getJobsByCustomer(req.params.customerId);
  res.send(jobs);
});

const addCommentToJob = catchAsync(async (req, res) => {
  const job = await jobService.addCommentToJob(req.params.jobId, req.body.comment);
  res.send(job);
});

const removeCommentFromJob = catchAsync(async (req, res) => {
  const job = await jobService.removeCommentFromJob(req.params.jobId, req.body.commentId);
  res.send(job);
});

const addHoursToJob = catchAsync(async (req, res) => {
  const { hours } = req.body;
  // Validate input
  if (hours < 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid Hours');
  }

  const job = await jobService.addHoursToJob(req.params.jobId, hours);
  res.send(job);
});

const removeHoursFromJob = catchAsync(async (req, res) => {
  const job = await jobService.removeHoursFromJob(req.params.jobId, req.body.employeeId);
  res.send(job);
});

const updateJobType = catchAsync(async (req, res) => {
  const job = await jobService.updateJobType(req.params.jobId, req.body.type);
  res.send(job);
});

const updateJobPriority = catchAsync(async (req, res) => {
  const job = await jobService.updateJobPriority(req.params.jobId, req.body.priority);
  res.send(job);
});

const assignUserToJob = catchAsync(async (req, res) => {
  const job = await jobService.assignUserToJob(req.params.jobId, req.body.userId);
  res.send(job);
});

const deleteUserFromJob = catchAsync(async (req, res) => {
  const job = await jobService.deleteUserFromJob(req.params.jobId, req.body.userId);
  res.send(job);
});

const addCustomerToJob = catchAsync(async (req, res) => {
  const job = await jobService.addCustomerToJob(req.params.jobId, req.body.customerId);
  res.send(job);
});

const deleteCustomerFromJob = catchAsync(async (req, res) => {
  const job = await jobService.deleteCustomerFromJob(req.params.jobId, req.body.customerId);
  res.send(job);
});

const addSiteToJob = catchAsync(async (req, res) => {
  const job = await jobService.addSiteToJob(req.params.jobId, req.body.siteId);
  res.send(job);
});

const deleteSiteFromJob = catchAsync(async (req, res) => {
  const job = await jobService.deleteSiteFromJob(req.params.jobId, req.body.siteId);
  res.send(job);
});

const updateJobDueDate = catchAsync(async (req, res) => {
  const job = await jobService.updateJobDueDate(req.params.jobId, req.body.dueDate);
  res.send(job);
});

const addChecklistToJob = catchAsync(async (req, res) => {
  const job = await jobService.addChecklistToJob(req.params.jobId, req.body.checklist);
  res.send(job);
});

const deleteChecklistFromJob = catchAsync(async (req, res) => {
  const job = await jobService.deleteChecklistFromJob(req.params.jobId, req.body.checklistId);
  res.send(job);
});

const updateJobRecurrence = catchAsync(async (req, res) => {
  const job = await jobService.updateJobRecurrence(req.params.jobId, req.body.recurrence);
  res.send(job);
});

const addImageToJob = catchAsync(async (req, res) => {
  const job = await jobService.addImageToJob(req.params.jobId, req.body.imageUrl);
  res.send(job);
});

const deleteImageFromJob = catchAsync(async (req, res) => {
  const job = await jobService.deleteImageFromJob(req.params.jobId, req.body.imageId);
  res.send(job);
});

const getUniqueAssignee = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantID;
  const result = await Job.aggregate([
    {
      $lookup: {
        from: 'User', // Name of the collection where Users are stored
        let: { userId: '$assignedTo' }, // Pass the user ObjectId from Job
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$_id', '$$userId'] }, // Match on user ID
                  { $eq: ['$tenantId', tenantId] }, // Match on tenantId
                ],
              },
            },
          },
        ],
        as: 'userDetails',
      },
    },
    {
      $unwind: {
        path: '$userDetails',
        preserveNullAndEmptyArrays: true, // Keep entries without a customer assigned
      },
    },
    {
      $project: {
        'userDetails._id': 1, // Include customer ID
        'userDetails.name': 1, // Only include businessName from customer
      },
    },
    {
      $group: {
        _id: null,
        users: {
          $addToSet: {
            _id: { $ifNull: ['$userDetails._id', null] }, // Use customer ID if available, null otherwise
            name: { $ifNull: ['$userDetails.name', 'Unassigned'] }, // Use businessName or fallback to 'Unassigned'
          },
        },
      },
    },
  ]);

  res.send({
    users: result[0]?.users || [],
  });
});

const getUniqueCustomers = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantID;
  const result = await Job.aggregate([
    {
      $lookup: {
        from: 'customer', // Name of the collection where vendors are stored
        let: { customerId: '$customer' }, // Pass the vendor ObjectId from PurchaseOrder
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$_id', '$$customerId'] }, // Match on vendor ID
                  { $eq: ['$tenantId', tenantId] }, // Match on tenantId
                ],
              },
            },
          },
        ],
        as: 'customerDetails',
      },
    },
    {
      $unwind: {
        path: '$customerDetails',
        preserveNullAndEmptyArrays: true, // Keep entries without a vendor assigned
      },
    },
    {
      $project: {
        'customerDetails._id': 1, // Include vendor ID
        'customerDetails.businessName': 1, // Only include companyName from vendor
      },
    },
    {
      $group: {
        _id: null,
        customers: {
          $addToSet: {
            _id: { $ifNull: ['$customerDetails._id', null] }, // Use vendor ID if available, null otherwise
            businessName: { $ifNull: ['$customerDetails.businessName', 'Unassigned'] }, // Use companyName or fallback to 'Unassigned'
          },
        },
      },
    },
  ]);

  res.send({
    customers: result[0]?.customers || [],
  });
});

const getUniqueLabels = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantID;

  const result = await Job.aggregate([
    {
      // Match jobs by tenantId
      $match: { tenantId: tenantId },
    },
    {
      // Unwind the label field so each label becomes a separate document
      $unwind: {
        path: '$label', // Adjusted to match the singular field 'label'
        preserveNullAndEmptyArrays: true, // Keep jobs that don't have any label
      },
    },
    {
      // Group by label and use $addToSet to ensure uniqueness
      $group: {
        _id: null, // No specific grouping key, just a single group
        labels: {
          $addToSet: '$label', // Collect unique labels
        },
      },
    },
  ]);

  // Return the unique labels found
  res.send({
    labels: result[0]?.labels || [], // If no labels found, return an empty array
  });
});

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
  getUniqueAssignee,
  getUniqueCustomers,
  getUniqueLabels,
};
