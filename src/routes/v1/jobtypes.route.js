const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const jobtypesValidation = require('../../validations/jobtypes.validation');
const jobtypesController = require('../../controllers/jobtypes.controller');

const router = express.Router();

// Add a new job type to the array
router.route('/add').post(auth('manageJobTypes'), validate(jobtypesValidation.addJobType), jobtypesController.addJobType);

// Delete a job type from the array
router
  .route('/delete')
  .post(auth('manageJobTypes'), validate(jobtypesValidation.deleteJobType), jobtypesController.deleteJobType);

// Get all job types for a specific tenant
router.route('/').get(auth('getJobTypes'), jobtypesController.getJobTypes); // Define the route for getting job types

module.exports = router;
