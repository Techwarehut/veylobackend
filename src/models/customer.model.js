const mongoose = require('mongoose');
const validator = require('validator');

const { toJSON, paginate } = require('./plugins');

// Define the SiteLocation Schema (Same as before)
const siteLocationSchema = mongoose.Schema({
  siteName: {
    type: String,
    trim: true,
    default: '',
  },
  siteContactPerson: {
    type: String,
    default: '',
    trim: true,
  },
  siteContactPhone: {
    type: String,
    default: '',
    trim: true,
    validate(value) {
      if (value && !validator.isMobilePhone(value, 'any')) {
        throw new Error('Invalid phone number');
      }
    },
  },
  AddressLine: {
    type: String,
    default: '',
    trim: true,
  },
  City: {
    type: String,
    default: '',
    trim: true,
  },
  Province: {
    type: String,
    default: '',
    trim: true,
  },
  zipcode: {
    type: String,
    default: '',
    trim: true,
  },
});

// Define the Billing Address Schema (Same as before)
const billingAddressSchema = mongoose.Schema(
  {
    AddressLine: {
      type: String,
      default: '',
      trim: true,
    },
    City: {
      type: String,
      default: '',
      trim: true,
    },
    Province: {
      type: String,
      default: '',
      trim: true,
    },
    zipcode: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

// Define the Customer Schema (Main Schema)
const customerSchema = mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant', // Reference to the Tenant model
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error('Invalid email');
        }
      },
    },
    phone: {
      type: String,
      default: '',
      trim: true,
      validate(value) {
        if (value && !validator.isMobilePhone(value, 'any')) {
          throw new Error('Invalid phone number');
        }
      },
    },
    website: {
      type: String,
      default: '',
      /* validate(value) {
        if (value && !validator.isURL(value, { require_protocol: false })) {
          throw new Error('Invalid URL');
        }
      }, */
    },
    billingAddress: billingAddressSchema,
    siteLocations: [siteLocationSchema],
    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the user who created the customer
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Add plugins for JSON conversion and pagination
customerSchema.plugin(toJSON);
customerSchema.plugin(paginate);

// Static method to check if email is already taken
customerSchema.statics.isEmailTaken = async function (email, excludeCustomerId) {
  const customer = await this.findOne({ email, _id: { $ne: excludeCustomerId } });
  return !!customer;
};

// Method to deactivate a customer
customerSchema.methods.deactivate = async function () {
  this.isActive = false;
  await this.save();
};

// Method to activate a customer
customerSchema.methods.activate = async function () {
  this.isActive = true;
  await this.save();
};

/**
 * @typedef Customer
 */

// Define the Customer model
const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
