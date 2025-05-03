const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { tenantService } = require('../services');
const logger = require('../config/logger');

const getTenant = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantID;
  const tenant = await tenantService.getTenantById(tenantId);

  if (!tenant) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tenant not found');
  }
  res.send(tenant);
});

const updateTenant = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantID;
  const tenant = await tenantService.updateTenantById(tenantId, req.body);
  res.send(tenant);
});

const uploadBusinessLogo = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantID;
  if (!req.file) {
    logger.error('Multer did not process the file. req.file is undefined.');
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    // Determine file URL (Cloud Storage or Local)
    const logoUrl = req.file.location || `uploads/${tenantId}/${req.file.filename}`;

    // Update tenant logo in database
    const updatedTenant = await tenantService.updateTenantLogo(req.user.tenantID, logoUrl);

    return res.status(200).json({
      message: 'Business logo uploaded successfully',
      logoUrl: updatedTenant.businessLogo,
    });
  } catch (error) {
    logger.error('Error processing file upload:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

const deleteLogo = catchAsync(async (req, res) => {
  try {
    const tenantId = req.user.tenantID;

    // Assuming you have a tenant service function to update the tenant with the new business logo URL
    const updatedTenant = await tenantService.updateTenantLogo(req.user.tenantID, '');

    // Respond with a success message
    return res.status(200).json({
      message: 'Business logo deleted successfully',
    });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ message: 'Error deleting logo', error: error.message });
  }
});

module.exports = {
  getTenant,
  updateTenant,
  uploadBusinessLogo,
  deleteLogo,
};
