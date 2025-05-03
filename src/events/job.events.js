const { sendNotificationsToUsers } = require('../services');
const notificationConfig = require('../config/notification');
const logger = require('../config/logger');

const handleJobEvents = async (event, job, excludedUserId) => {
  const config = notificationConfig[event];
  if (!config?.enabled) return;

  const allowedRoles = config.roles || [];

  const usersToNotify = [...job.assignedTo, job.reportedBy].filter(
    (user) => user.id !== excludedUserId && allowedRoles.includes(user.role) && user.pushToken
  );

  const tokensByRole = {};
  for (const user of usersToNotify) {
    if (!user.pushToken) continue;
    tokensByRole[user.role] ??= [];
    tokensByRole[user.role].push(user.pushToken);
  }

  switch (event) {
    case 'JOB_CREATED': {
      for (const role in tokensByRole) {
        const tokens = tokensByRole[role];
        let title = 'New Job';
        let body;

        switch (role) {
          case 'lead':
            body = `There is a new job: ${job.title}`;
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
    case 'JOB_UPDATED': {
      for (const role in tokensByRole) {
        const tokens = tokensByRole[role];
        let title = 'Job Update';
        let body;

        switch (role) {
          case 'lead':
            body = `There is an update to job: ${job.title}`;
            break;
          case 'member':
            body = `There is an update to job: ${job.title}`;
            break;
          case 'owner':
            body = `There is an update to job: ${job.title}`;
            break;
          default:
            body = `There is an update to job: ${job.title}`;
        }

        await sendNotificationsToUsers(tokens, title, body);
      }
      break;
    }
    // Add more job-related events here
    default:
      logger.warn(`Unhandled job event: ${event}`);
  }
};

module.exports = { handleJobEvents };
