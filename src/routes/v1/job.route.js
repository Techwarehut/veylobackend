const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const jobValidation = require('../../validations/job.validation');
const jobController = require('../../controllers/job.controller');
const upload = require('../../middlewares/storage');

const router = express.Router();

router
  .route('/')
  .post(auth('addJobs'), validate(jobValidation.createJob), jobController.createJob)
  .get(auth('getJobs'), validate(jobValidation.getJobs), jobController.getJobs);

router
  .route('/:jobId')
  .get(auth('getJobs'), validate(jobValidation.getJob), jobController.getJob)
  .patch(auth('updateJobs'), validate(jobValidation.updateJob), jobController.updateJob)
  .delete(auth('deleteJobs'), validate(jobValidation.deleteJob), jobController.deleteJob);

router
  .route('/:jobId/status')
  .patch(auth('updateJobsAllowed'), validate(jobValidation.updateJobStatus), jobController.updateJobStatus);

router
  .route('/customer/:customerId')
  .get(auth('getJobs'), validate(jobValidation.getJobsByCustomer), jobController.getJobsByCustomer);

router
  .route('/:jobId/comments')
  .post(auth('updateJobsAllowed'), validate(jobValidation.addCommentToJob), jobController.addCommentToJob)
  .delete(auth('updateJobs'), validate(jobValidation.removeCommentFromJob), jobController.removeCommentFromJob);

router
  .route('/:jobId/hours')
  .post(auth('updateJobsAllowed'), validate(jobValidation.addHoursToJob), jobController.addHoursToJob)
  .delete(auth('updateJobs'), validate(jobValidation.removeHoursFromJob), jobController.removeHoursFromJob);

router.route('/:jobId/type').patch(auth('updateJobs'), validate(jobValidation.updateJobType), jobController.updateJobType);

router
  .route('/:jobId/priority')
  .patch(auth('updateJobs'), validate(jobValidation.updateJobPriority), jobController.updateJobPriority);

router
  .route('/:jobId/assign')
  .post(auth('updateJobs'), validate(jobValidation.assignUserToJob), jobController.assignUserToJob)
  .delete(auth('updateJobs'), validate(jobValidation.deleteUserFromJob), jobController.deleteUserFromJob);

router
  .route('/:jobId/customer')
  .post(auth('updateJobs'), validate(jobValidation.addCustomerToJob), jobController.addCustomerToJob)
  .delete(auth('updateJobs'), validate(jobValidation.deleteCustomerFromJob), jobController.deleteCustomerFromJob);

router
  .route('/:jobId/site')
  .post(auth('updateJobs'), validate(jobValidation.addSiteToJob), jobController.addSiteToJob)
  .delete(auth('updateJobs'), validate(jobValidation.deleteSiteFromJob), jobController.deleteSiteFromJob);

router
  .route('/:jobId/dueDate')
  .patch(auth('updateJobs'), validate(jobValidation.updateJobDueDate), jobController.updateJobDueDate);

router
  .route('/:jobId/checklist')
  .post(auth('updateJobs'), validate(jobValidation.addChecklistToJob), jobController.addChecklistToJob)
  .delete(auth('updateJobs'), validate(jobValidation.deleteChecklistFromJob), jobController.deleteChecklistFromJob);

router.route('/:jobId/checklist/task/:taskId/toggle').patch(auth('updateJobs'), jobController.toggleTaskStatus);

router
  .route('/:jobId/recurrence')
  .patch(auth('updateJobs'), validate(jobValidation.updateJobRecurrence), jobController.updateJobRecurrence);

router
  .route('/:jobId/images')
  .post(
    auth('updateJobsAllowed'),
    upload.array('images', 5), // Adjust field name & max count as needed

    jobController.addImageToJob
  )
  .delete(auth('updateJobsAllowed'), jobController.deleteImageFromJob);
// Endpoint to fetch unique customers and vendors
router.route('/unique/customers').get(auth('getJobs'), jobController.getUniqueCustomers);

// Endpoint to fetch unique customers and vendors
router.route('/unique/labels').get(auth('getJobs'), jobController.getUniqueLabels);

// Endpoint to fetch unique customers and vendors
router.route('/unique/assignee').get(auth('getJobs'), jobController.getUniqueAssignee);

module.exports = router;
