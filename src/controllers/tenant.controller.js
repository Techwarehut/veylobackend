const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { tenantService } = require('../services');
const { upload } = require('../config/storage');

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

// Controller to handle the file upload
const uploadBusinessLogo = (req, res) => {
  console.log('I am in controller');
  upload.single('businessLogo')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: 'Error uploading file', error: err });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Save the file URL to the database (assuming the URL is available in req.file.location for cloud storage)
      const logoUrl = req.file.location || `/uploads/${req.file.filename}`;

      // Assuming you have a tenant service function to update the tenant with the new business logo URL
      const updatedTenant = await tenantService.updateTenantLogo(req.user.tenantID, logoUrl);

      return res.status(200).json({
        message: 'Business logo uploaded successfully',
        logoUrl: updatedTenant.businessLogo,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
};

const deleteLogo = async (req, res) => {
  try {
    const tenantId = req.user.tenantID;

    // Find the tenant by their ID
    const tenant = await tenantService.getTenantById(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // Clear the businessLogo field in the tenant document
    tenant.businessLogo = ''; // or set to a default placeholder if required
    await tenant.save();

    // Respond with a success message
    return res.status(200).json({
      message: 'Business logo deleted successfully',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error deleting logo', error: error.message });
  }
};

module.exports = {
  getTenant,
  updateTenant,
  uploadBusinessLogo,
  deleteLogo,
};
