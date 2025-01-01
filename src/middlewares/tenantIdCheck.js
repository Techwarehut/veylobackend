// tenantIdCheck.js
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

const tenantIdCheck = (req, res, next) => {
  const tenantIdFromRequest = req.query.tenantId;

  if (!tenantIdFromRequest) {
    return next(new ApiError(httpStatus.BAD_REQUEST, 'tenantId is required.'));
  }

  if (req.user.tenantID.toString() !== tenantIdFromRequest) {
    return next(new ApiError(httpStatus.FORBIDDEN, 'Forbidden: You do not have access to this tenant.'));
  }

  next();
};

module.exports = tenantIdCheck;
