const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { jobService, customerService } = require('../services');
const { Job } = require('../models');
const pick = require('../utils/pick');
const mongoose = require('mongoose'); // Ensure this is present!

const populateJob = async (job) => {
  const populatedJob = await Job.populate(job, [
    { path: 'reportedBy', select: 'id name profileUrl' },
    { path: 'assignedTo', select: 'id name profileUrl' },
    { path: 'customer', select: 'id businessName' },
    { path: 'comments.createdBy', select: 'id name profileUrl' },
  ]);

  // Step 2: Manually extract the correct `siteLocation` from the embedded array
  if (populatedJob.customer && populatedJob.siteLocationId) {
    const customerDetails = await customerService.getCustomerById(populatedJob.customer._id);

    const matchingSiteLocation = customerDetails?.siteLocations?.find(
      (location) => location._id.toString() === populatedJob.siteLocationId.toString()
    );

    // Assign detailed data to the new field
    populatedJob.siteLocation = matchingSiteLocation || null;
  }

  return populatedJob;
};

const createJob = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantID;

  if (!tenantId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Tenant ID is required');
  }

  const { checklistID, recurrence = {} } = req.body;
  const { type, totalIterations = 1, dueDates = [] } = recurrence;
  console.log('Before API Call', type, totalIterations, dueDates);

  const jobs = [];

  for (let i = 0; i < (type !== 'none' ? totalIterations : 1); i++) {
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
      dueDate: type !== 'none' ? dueDates[i] || new Date() : req.body.dueDate,
      recurrence: {
        ...req.body.recurrence,
        completedIterations: i + 1, // update based on iteration
      },
    };

    let result = await jobService.createJob(jobData);

    if (checklistID) result = await jobService.addChecklistToJob(result._id, checklistID);

    const populatedResult = await Job.populate(result, [
      { path: 'reportedBy', select: 'id name profileUrl' },
      { path: 'assignedTo', select: 'id name profileUrl' },
      { path: 'customer', select: 'id  businessName' },
    ]);

    // Step 2: Manually extract the correct `siteLocation` from the embedded array

    if (populatedResult.customer && populatedResult.siteLocationId) {
      const customerDetails = await customerService.getCustomerById(populatedResult.customer._id);

      const matchingSiteLocation = customerDetails?.siteLocations?.find(
        (location) => location._id.toString() === populatedResult.siteLocationId.toString()
      );

      // Assign detailed data to the new field
      populatedResult.siteLocation = matchingSiteLocation || null;
    }
    jobs.push(populatedResult);
  }

  // Step 4: Return jobs
  if (jobs.length === 1) {
    return res.status(httpStatus.CREATED).send(jobs[0]);
  } else {
    return res.status(httpStatus.CREATED).send(jobs);
  }
  //res.status(httpStatus.CREATED).send(populatedResult);
});

const getJobs = catchAsync(async (req, res) => {
  const { searchText, status, jobType, assignedTo, label, customer, due } = req.query;
  const filter = pick(req.query, ['assignedTo', 'label', 'customer', 'jobType', 'status']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  // Assuming the logged-in user's ID is stored in req.user
  const userId = req.user.id;
  filter.tenantId = req.user.tenantID;

  // Add filter to ensure only jobs assigned  to the user are returned
  if (req.user.role === 'member') {
    filter.assignedTo = userId;
    filter.status = { $in: ['Backlog', 'In Progress', 'On Hold'] };
  }

  if (!options.sortBy) {
    options.sortBy = 'dueDate priority -createdAt'; // Default sorting order
  }

  if (due) filter.dueDate = { $lte: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) };

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

  // Handle multiple jobType (comma-separated values)
  if (jobType) {
    const jobTypeArray = jobType.split(','); // Convert status string to an array
    filter.jobType = { $in: jobTypeArray }; // Use $in operator for multiple statuses
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

  if (assignedTo && assignedTo.trim() !== '') {
    // Validate ObjectId
    if (mongoose.Types.ObjectId.isValid(assignedTo)) {
      filter.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    } else {
      return res.status(400).json({ error: 'Invalid assignedTo ID' });
    }
  } else if (assignedTo !== undefined && (assignedTo === null || assignedTo.trim() === '')) {
    // Ensure assignedTo="" is ignored and fetch only unassigned jobs
    delete filter.assignedTo; // Remove invalid filter
    filter.$or = [{ assignedTo: { $exists: false } }, { assignedTo: [] }];
  }

  if (label && label.trim() !== '') {
    filter.label = label; // Normal filtering when a valid label is provided
  } else if (label !== undefined && (label === null || label.trim() === '')) {
    // Fetch jobs with no label (null, empty string, or missing)
    filter.$or = [{ label: { $exists: false } }, { label: null }, { label: '' }];
  }

  if (customer && customer.trim() !== '') {
    // Ensure customer is not an empty string before checking ObjectId validity
    if (mongoose.Types.ObjectId.isValid(customer)) {
      filter.customer = new mongoose.Types.ObjectId(customer);
    } else {
      return res.status(400).json({ error: 'Invalid Customer ID' });
    }
  } else if (customer !== undefined && (customer === null || customer.trim() === '')) {
    // Properly remove `customer` from the filter
    delete filter.customer;

    // Exclude empty string if it’s causing casting issues
    filter.$or = [{ customer: { $exists: false } }, { customer: null }];
  }

  const result = await jobService.getJobs(filter, options);

  const populatedResult = await Job.populate(result.results, [
    //{ path: 'siteLocation', select: '_id siteContactPerson' },
    { path: 'reportedBy', select: 'id name profileUrl' },
    { path: 'assignedTo', select: 'id name profileUrl' },
    { path: 'customer', select: 'id  businessName' },
    // { path: 'jobID', select: 'jobTitle jobCode' },
  ]);

  // Step 2: Manually extract the correct `siteLocation` from the embedded array

  for (const job of populatedResult) {
    console.log(job.status);
    if (job.customer && job.siteLocationId) {
      const customerDetails = await customerService.getCustomerById(job.customer._id);

      const matchingSiteLocation = customerDetails?.siteLocations?.find(
        (location) => location._id.toString() === job.siteLocationId.toString()
      );

      // Assign detailed data to the new field
      job.siteLocation = matchingSiteLocation || null;
    }
  }

  res.send({
    results: populatedResult,
    totalResults: result.totalResults,
    totalPages: result.totalPages,
    currentPage: options.page,
  });
});

const getJob = catchAsync(async (req, res) => {
  const job = await jobService.getJobById(req.params.jobId);

  const populatedResult = await populateJob(job);
  console.log(populatedResult);

  res.send(populatedResult);
});

const updateJob = catchAsync(async (req, res) => {
  const job = await jobService.updateJobById(req.params.jobId, req.body);

  const populatedResult = await populateJob(job);
  res.send(populatedResult);
});

const deleteJob = catchAsync(async (req, res) => {
  await jobService.deleteJobById(req.params.jobNumber);
  res.status(httpStatus.NO_CONTENT).send();
});

const updateJobStatus = catchAsync(async (req, res) => {
  const { user } = req;
  const { status } = req.body;
  console.log(status);
  const allowedMemberStatuses = ['In Progress', 'On Hold', 'Approval Pending'];

  if (user.role === 'member') {
    if (!allowedMemberStatuses.includes(status)) {
      return res.status(403).json({ message: 'You are not allowed to set this status.' });
    }
  }
  const job = await jobService.updateJobStatus(req.params.jobId, status);
  // Use the reusable populate function with siteLocation logic included
  const populatedResult = await populateJob(job);

  res.send(populatedResult);
});

const getJobsByCustomer = catchAsync(async (req, res) => {
  const jobs = await jobService.getJobsByCustomer(req.params.customerId);
  res.send(jobs);
});

const addCommentToJob = catchAsync(async (req, res) => {
  const job = await jobService.addCommentToJob(req.params.jobId, req.body);
  const populatedResult = await populateJob(job);

  res.send(populatedResult);
});

const removeCommentFromJob = catchAsync(async (req, res) => {
  const job = await jobService.removeCommentFromJob(req.params.jobId, req.body.comment);
  res.send(job);
});

const addHoursToJob = catchAsync(async (req, res) => {
  const { hours, userId } = req.body;
  // Validate input
  if (hours < 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid Hours');
  }

  const job = await jobService.addHoursToJob(req.params.jobId, userId, hours);
  const populatedResult = await populateJob(job);

  res.send(populatedResult);
});

const removeHoursFromJob = catchAsync(async (req, res) => {
  const job = await jobService.removeHoursFromJob(req.params.jobId, req.body.employeeId);
  const populatedResult = await populateJob(job);

  res.send(populatedResult);
});

const updateJobType = catchAsync(async (req, res) => {
  const job = await jobService.updateJobType(req.params.jobId, req.body.jobType);

  const populatedResult = await populateJob(job);

  res.send(populatedResult);
});

const updateJobPriority = catchAsync(async (req, res) => {
  const job = await jobService.updateJobPriority(req.params.jobId, req.body.priority);
  const populatedResult = await populateJob(job);

  res.send(populatedResult);
});

const assignUserToJob = catchAsync(async (req, res) => {
  const job = await jobService.assignUserToJob(req.params.jobId, req.body.userId);
  const populatedResult = await populateJob(job);

  res.send(populatedResult);
});

const deleteUserFromJob = catchAsync(async (req, res) => {
  const job = await jobService.deleteUserFromJob(req.params.jobId, req.body.userId);
  const populatedResult = await populateJob(job);

  res.send(populatedResult);
});

const addCustomerToJob = catchAsync(async (req, res) => {
  const job = await jobService.addCustomerToJob(req.params.jobId, req.body.customer);
  const populatedResult = await populateJob(job);

  res.send(populatedResult);
});

const deleteCustomerFromJob = catchAsync(async (req, res) => {
  const job = await jobService.deleteCustomerFromJob(req.params.jobId);
  const populatedResult = await populateJob(job);

  res.send(populatedResult);
});

const addSiteToJob = catchAsync(async (req, res) => {
  const job = await jobService.addSiteToJob(req.params.jobId, req.body.siteLocationId);
  const populatedResult = await populateJob(job);

  res.send(populatedResult);
});

const deleteSiteFromJob = catchAsync(async (req, res) => {
  const job = await jobService.deleteSiteFromJob(req.params.jobId);
  const populatedResult = await populateJob(job);

  res.send(populatedResult);
});

const updateJobDueDate = catchAsync(async (req, res) => {
  const job = await jobService.updateJobDueDate(req.params.jobId, req.body.dueDate);
  const populatedResult = await populateJob(job);

  res.send(populatedResult);
});

const addChecklistToJob = catchAsync(async (req, res) => {
  const job = await jobService.addChecklistToJob(req.params.jobId, req.body.checklistID);
  const populatedResult = await populateJob(job);

  res.send(populatedResult);
});

const deleteChecklistFromJob = catchAsync(async (req, res) => {
  const job = await jobService.deleteChecklistFromJob(req.params.jobId);
  const populatedResult = await populateJob(job);

  res.send(populatedResult);
});

const toggleTaskStatus = catchAsync(async (req, res) => {
  const { jobId, taskId } = req.params;
  const job = await jobService.toggleTaskStatus(jobId, taskId);
  const populatedResult = await populateJob(job);

  res.send(populatedResult);
});

const updateJobRecurrence = catchAsync(async (req, res) => {
  const job = await jobService.updateJobRecurrence(req.params.jobId, req.body.recurrence);
  res.send(job);
});

const addImageToJob = catchAsync(async (req, res) => {
  const { jobId } = req.params;
  const tenantId = req.user.tenantID;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'No images uploaded.' });
  }

  // Determine file URL (Cloud Storage or Local)
  //const logoUrl = req.file.location || `uploads/${tenantId}/${req.file.filename}`;
  console.log(files);

  // Save image info to DB or cloud storage
  const imageUrls = files.map((file) => file.location || `uploads/${tenantId}/${file.filename}`); // or file.location if you're using something like multer-s3

  const job = await jobService.addImageToJob(jobId, imageUrls);
  const populatedResult = await populateJob(job);

  res.send(populatedResult);
});

const deleteImageFromJob = catchAsync(async (req, res) => {
  const { jobId } = req.params; // Extract jobId from the URL params
  const { imageUrl } = req.body; // The URL of the image to delete, sent in the body

  if (!imageUrl) {
    return res.status(400).json({ message: 'Image URL is required' });
  }

  const job = await jobService.deleteImageFromJob(jobId, imageUrl);
  const populatedResult = await populateJob(job);

  res.send(populatedResult);
});

const getUniqueAssignee = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantID;

  const result = await Job.aggregate([
    {
      $unwind: {
        path: '$assignedTo',
        preserveNullAndEmptyArrays: true, // Preserve jobs without assignees
      },
    },
    {
      $lookup: {
        from: 'users', // Ensure this matches your actual collection name
        localField: 'assignedTo', // assignedTo is an array of ObjectIds
        foreignField: '_id', // Match with _id in User collection
        as: 'assigneeDetails',
      },
    },
    {
      $unwind: {
        path: '$assigneeDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        $or: [
          { 'assigneeDetails.tenantID': tenantId }, // Keep assigned users with the correct tenantId
          { assigneeDetails: null }, // Keep jobs with no assignees
        ],
      },
    },
    {
      $group: {
        _id: null,
        assignees: {
          $addToSet: {
            _id: '$assigneeDetails._id',
            name: '$assigneeDetails.name',
          },
        },
      },
    },
    {
      $project: {
        _id: 0, // Remove unnecessary _id
        assignees: 1,
      },
    },
  ]);

  res.status(200).json({ users: result[0]?.assignees || [] });
});

const getUniqueCustomers = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantID;

  const result = await Job.aggregate([
    {
      $match: {
        $or: [
          { customer: { $exists: true, $ne: '' } }, // Ignore empty customer values
          { customer: null }, // Include jobs without customers
        ],
      },
    },
    {
      $lookup: {
        from: 'customers', // Ensure this matches your actual collection name
        localField: 'customer', // Job.customer holds the ObjectId of Customer
        foreignField: '_id', // Match with _id in Customer collection
        as: 'customerDetails',
      },
    },
    {
      $unwind: {
        path: '$customerDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        $or: [
          { 'customerDetails.tenantId': tenantId }, // Keep only relevant customers
          { customerDetails: null }, // Keep jobs with no assigned customers
        ],
      },
    },
    {
      $group: {
        _id: '$customerDetails._id', // Group directly by customer ID
        businessName: { $first: '$customerDetails.businessName' }, // Get the business name
      },
    },
    {
      $project: {
        _id: 0,
        customerId: '$_id', // Rename _id to customerId
        businessName: 1,
      },
    },
  ]);

  res.status(200).json({ customers: result });
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
  toggleTaskStatus,
};
