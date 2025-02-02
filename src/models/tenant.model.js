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

    currency: {
      type: String,
      required: true,
    },

    /** References to Other Models **/
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' }, // Reference to Subscription model
    checklists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Checklist' }], // Reference to multiple checklists
  },
  {
    timestamps: true,
  }
);

// Add plugins for JSON conversion and pagination
tenantSchema.plugin(toJSON);
tenantSchema.plugin(paginate);

/**
 * @typedef Tenant
 */
const Tenant = mongoose.model('Tenant', tenantSchema);

module.exports = Tenant;
