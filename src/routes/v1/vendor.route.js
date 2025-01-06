const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const vendorValidation = require('../../validations/vendor.validation');
const vendorController = require('../../controllers/vendor.controller');

const router = express.Router();

router
  .route('/')
  .post(auth('manageVendors'), validate(vendorValidation.createVendor), vendorController.createVendor)
  .get(auth('getVendors'), validate(vendorValidation.getVendors), vendorController.getVendors);

router
  .route('/:vendorId')
  .get(auth('getVendors'), validate(vendorValidation.getVendor), vendorController.getVendor)
  .patch(auth('manageVendors'), validate(vendorValidation.updateVendor), vendorController.updateVendor)
  .delete(auth('manageVendors'), validate(vendorValidation.deleteVendor), vendorController.deleteVendor);

router
  .route('/:vendorId/activate')
  .post(auth('manageVendors'), validate(vendorValidation.activateVendor), vendorController.activateVendor);

router
  .route('/:vendorId/deactivate')
  .post(auth('manageVendors'), validate(vendorValidation.deactivateVendor), vendorController.deactivateVendor);

module.exports = router;
