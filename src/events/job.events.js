const { sendNotificationsToUsers } = require('../services');
const notificationConfig = require('../config/notification');

const handleJobEvents = async (event, job) => {
  const config = notificationConfig[event];
  if (!config?.enabled) return;

  const allowedRoles = config.roles || [];

  const usersToNotify = [...job.assignedTo, job.reportedBy].filter(
    (user) => allowedRoles.includes(user.role) && user.pushToken
  );

  const tokensByRole = {};
  for (const user of usersToNotify) {
    if (!user.pushToken) continue;
    tokensByRole[user.role] ??= [];
    tokensByRole[user.role].push(user.pushToken);
  }

  switch (event) {
    case 'JOB_ASSIGNED': {
      for (const role in tokensByRole) {
        const tokens = tokensByRole[role];
        let title = 'New Job Assigned';
        let body;

        switch (role) {
          case 'lead':
            body = `You (as Lead) have been assigned a new job: ${job.title}`;
            break;
          case 'member':
            body = `You have been assigned to job: ${job.title}`;
            break;
          case 'owner':
            body = `Your team has a new job: ${job.title}`;
            break;
          default:
            body = `You have a new job: ${job.title}`;
        }

        await sendNotificationsToUsers(tokens, title, body);
      }
      break;
    }
    case 'JOB_COMPLETED': {
      break;
    }
    // Add more job-related events here
    default:
      console.warn(`Unhandled job event: ${event}`);
  }
};

module.exports = { handleJobEvents };
