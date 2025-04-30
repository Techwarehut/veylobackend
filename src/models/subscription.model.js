const mongoose = require('mongoose');

const subscriptionSchema = mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true }, // Reference to Tenant
    stripeSubscriptionId: { type: String, required: true, unique: true }, // Stripe subscription ID
    customerId: { type: String, required: true }, // Stripe customer ID
    planType: {
      type: String,
      enum: ['Start Up', 'Grow', 'Enterprise'],
      default: 'Start Up',
    },
    priceId: { type: String },

    subscriptionStartDate: { type: Date, required: true },
    subscriptionEndDate: { type: Date, required: true },
    trialStartDate: { type: Date }, // Optional trial start date
    trialEndDate: { type: Date }, // Optional trial end date
    status: {
      type: String,
      enum: ['trialing', 'active', 'past_due', 'cancelled', 'incomplete', 'payment attached', 'cancel scheduled'],
      default: 'trialing',
    },
    currency: { type: String, required: true },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Pending', 'Overdue'],
      default: 'Paid',
    },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    canceledAt: { type: Date }, // Timestamp of cancellation
    paymentURL: { type: String }, // Latest invoice ID
    employeeCount: { type: Number, default: 0 }, // Moved from Tenant model
  },
  {
    timestamps: true,
  }
);

//subscriptionSchema.plugin(toJSON);

// Set default employeeCount based on planType when creating subscription
subscriptionSchema.pre('save', function (next) {
  if (this.isNew) {
    switch (this.planType) {
      case 'Start Up':
        this.employeeCount = 4;
        break;
      case 'Grow':
        this.employeeCount = 15;
        break;
      case 'Enterprise':
        this.employeeCount = 9999;
        break;
      default:
        this.employeeCount = 0;
    }
  }
  next();
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);
module.exports = Subscription;
