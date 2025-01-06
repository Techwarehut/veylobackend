const mongoose = require('mongoose');
const validator = require('validator');
const { toJSON, paginate } = require('./plugins');

// Define the Address Schema
const addressSchema = mongoose.Schema(
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

// Define the Contact Person Schema
const contactPersonSchema = mongoose.Schema(
  {
    name: {
      type: String,
      default: '',
      trim: true,
    },
    title: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
      validate(value) {
        if (value && !validator.isEmail(value)) {
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
  },
  { _id: false }
);

// Define the Vendor Schema
const vendorSchema = mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant', // Reference to the Tenant model
      required: true,
      index: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    contactPerson: contactPersonSchema, // Embedded Contact Person schema
    address: addressSchema, // Embedded Address schema
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the user who created the vendor
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Add plugins for JSON conversion and pagination
vendorSchema.plugin(toJSON);
vendorSchema.plugin(paginate);

// Static method to check if a company name is already taken
vendorSchema.statics.isEmailTaken = async function (email, excludeVendorId) {
  const vendor = await this.findOne({ email, _id: { $ne: excludeVendorId } });
  return !!vendor;
};

// Method to deactivate a vendor
vendorSchema.methods.deactivate = async function () {
  this.isActive = false;
  await this.save();
};

// Method to activate a vendor
vendorSchema.methods.activate = async function () {
  this.isActive = true;
  await this.save();
};

/**
 * @typedef Vendor
 */

// Define the Vendor model
const Vendor = mongoose.model('Vendor', vendorSchema);

module.exports = Vendor;
