const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const dashboardService = require('../services/dashboard.service');

const getDashboardData = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantID;
  const role = req.user.role;
  const userId = req.user.id;

  const dashboardData = await dashboardService.getDashboardData({ tenantId, role, userId });

  res.status(httpStatus.OK).send(dashboardData);
});

module.exports = {
  getDashboardData,
};
