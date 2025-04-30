const { handleJobEvents } = require('./job.events');
const { handlePurchaseEvents } = require('./purchase.events');

const events = {
  handleEvent: async (type, payload) => {
    switch (type) {
      case 'JOB':
        return handleJobEvents(payload.event, payload.job);
      case 'PURCHASE':
        return handlePurchaseEvents(payload.event, payload.purchase);
      default:
        console.warn(`Unhandled event type: ${type}`);
    }
  },
};

module.exports = events;
