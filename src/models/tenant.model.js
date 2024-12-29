const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const tenantSchema = mongoose.Schema(
  {
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    businessLogo: {
      type: String,
      default: 'https://via.placeholder.com/300x200?text=Logo+Placeholder',
    },
    businessType: {
      type: String,
      default: '',
    },
    businessPhone: {
      type: String,
      default: '',
      trim: true,
    },
    businessEmail: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    businessWebsite: {
      type: String,
      default: '',
    },
    businessBillingAddress: {
      addressLine: {
        type: String,
        default: '',
      },
      city: {
        type: String,
        default: '',
      },
      zipCode: {
        type: String,
        default: '',
      },
      province: {
        type: String,
        default: '',
      },
      country: {
        type: String,
        required: true, // Country is required
      },
    },
    businessTaxID: {
      type: String,
      default: '',
    },
    taxRate: {
      type: Number,
      default: 0,
    },
    employeeCount: {
      type: Number,
      default: 0, // Default employee count
    },
    customerNotificationPreferences: {
      email: {
        type: Boolean,
        default: true,
      },
      sms: {
        type: Boolean,
        default: true,
      },
    },
    planType: {
      type: String,
      enum: ['Core', 'Pro', 'Enterprise'],
      default: 'Core', // Default plan type
    },
    subscriptionStartDate: {
      type: Date,
      required: true,
    },
    subscriptionEndDate: {
      type: Date,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Pending', 'Overdue'],
      default: 'Paid',
    },
    currency: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add plugins for JSON conversion and pagination
tenantSchema.plugin(toJSON);
tenantSchema.plugin(paginate);

// Pre-save hook to set employeeCount based on planType (on initial creation)
tenantSchema.pre('save', function (next) {
  if (this.isNew) {
    // Set employee count based on planType
    switch (this.planType) {
      case 'Core':
        this.employeeCount = 4; // Set employeeCount for 'Core' plan
        break;
      case 'Pro':
        this.employeeCount = 15; // Set employeeCount for 'Pro' plan
        break;
      case 'Enterprise':
        this.employeeCount = 1000; // Set employeeCount for 'Enterprise' plan
        break;
      default:
        this.employeeCount = 0; // Fallback if somehow no planType is set
    }
  }
  next();
});

// Pre-update hook to update employeeCount when planType changes
tenantSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();

  if (update.planType) {
    // Check if the planType is being updated
    switch (update.planType) {
      case 'Core':
        update.employeeCount = 4; // Set employeeCount for 'Core' plan
        break;
      case 'Pro':
        update.employeeCount = 15; // Set employeeCount for 'Pro' plan
        break;
      case 'Enterprise':
        update.employeeCount = 1000; // Set employeeCount for 'Enterprise' plan
        break;
      default:
        update.employeeCount = 0; // Fallback if somehow no planType is set
    }
  }

  next();
});

/**
 * @typedef Tenant
 */
const Tenant = mongoose.model('Tenant', tenantSchema);

module.exports = Tenant;
