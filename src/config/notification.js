module.exports = {
  JOB_ASSIGNED: {
    enabled: true,
    roles: ['lead', 'owner'], // only these roles get notified
  },
  JOB_COMPLETED: {
    enabled: true,
    roles: ['owner'],
  },
  PURCHASE_APPROVED: {
    enabled: false,
  },
};
