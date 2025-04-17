const { Job, PurchaseOrder } = require('../models');
const mongoose = require('mongoose');

const getDashboardData = async ({ tenantId, role, userId }) => {
  const matchStage = {
    tenantId: mongoose.Types.ObjectId(tenantId),
  };

  if (role === 'member') {
    matchStage.assignedTo = mongoose.Types.ObjectId(userId);
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Run all counts in parallel
  const [
    totalJobs,
    jobsByStatus,
    upcomingJobs,
    uniqueCustomers,
    uniqueUsers,
    overdueJobs,
    unassignedJobs,
    purchaseOrdersByStatus,
  ] = await Promise.all([
    Job.countDocuments(matchStage),
    Job.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    Job.countDocuments({
      ...matchStage,
      dueDate: { $lte: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
    }),
    Job.distinct('customer', matchStage),
    Job.distinct('assignedTo', matchStage),
    Job.countDocuments({
      ...matchStage,
      dueDate: { $lte: today },
      status: { $in: ['Backlog', 'In Progress', 'On Hold'] }, // Optional: exclude Done/Cancelled
    }),
    Job.countDocuments({
      ...matchStage,
      $or: [{ assignedTo: { $exists: false } }, { assignedTo: { $size: 0 } }],
    }),
    PurchaseOrder.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const customerCount = uniqueCustomers.filter(Boolean).length;
  const userCount = uniqueUsers.filter(Boolean).length;

  return {
    totalJobs,
    upcomingJobs,
    customerCount,
    userCount,
    overdueJobs,
    unassignedJobs,
    jobsByStatus: jobsByStatus.reduce((acc, cur) => {
      acc[cur._id || 'Unspecified'] = cur.count;
      return acc;
    }, {}),
    purchaseOrdersByStatus: purchaseOrdersByStatus.reduce((acc, cur) => {
      acc[cur._id || 'Unspecified'] = cur.count;
      return acc;
    }, {}),
  };
};

module.exports = {
  getDashboardData,
};
