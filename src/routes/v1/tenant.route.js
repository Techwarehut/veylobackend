const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const tenantValidation = require('../../validations/tenant.validation');
const tenantController = require('../../controllers/tenant.controller');

const router = express.Router();

router
  .route('/')
  .get(auth('getTenant'), validate(tenantValidation.getTenant), tenantController.getTenant)
  .patch(auth('manageTenant'), validate(tenantValidation.updateTenant), tenantController.updateTenant);

// Upload business logo
router.route('/upload').post(auth('manageTenant'), tenantController.uploadBusinessLogo);

// Delete business logo
router.route('/deleteLogo').patch(auth('manageTenant'), tenantController.deleteLogo);

module.exports = router;
