const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { toJSON, paginate } = require('./plugins');
const { roles } = require('../config/roles');

const userSchema = mongoose.Schema(
  {
    name: {
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
    password: {
      type: String,
      required: true,
      trim: true,
      minlength: 8,
      validate(value) {
        if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
          throw new Error('Password must contain at least one letter and one number');
        }
      },
      private: true, // Used by the toJSON plugin
    },
    role: {
      type: String,
      enum: roles,
      default: 'owner', // Default to employee; 'owner' or 'admin' can be assigned later
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    tenantID: {
      // Link this user to a tenant
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant', // Reference to the Tenant model (this assumes you have a Tenant model)
      required: true,
      index: true,
    },
    isActive: {
      // Mark user as active or inactive
      type: Boolean,
      default: true,
    },
    profileUrl: {
      type: String,
      default: '', // Placeholder for profile image
    },
    phone: {
      type: String,
      default: '', // Empty string by default
      trim: true,
    },
    emergencyContact: {
      ename: { type: String, default: '' }, // Default to empty string
      ephone: { type: String, default: '' }, // Default to empty string
    },
    activeJobs: {
      type: Number,
      default: 0, // Default to 0 for active jobs
    },
    completedJobs: {
      type: Number,
      default: 0, // Default to 0 for completed jobs
    },
    pushToken: {
      type: String,
      default: '', // Default to empty string if no token is set
      trim: true,
    },
  },
  {
    timestamps: true, // automatically adds createdAt and updatedAt fields
  }
);

// Add plugins for JSON conversion and pagination
userSchema.plugin(toJSON);
userSchema.plugin(paginate);

// Static method to check if email is already taken
userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

// Instance method to compare user password
userSchema.methods.isPasswordMatch = async function (password) {
  const user = this;
  return bcrypt.compare(password, user.password);
};

// Pre-save hook to hash the password if it has been modified
userSchema.pre('save', async function (next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8); // Hash password
  }
  next();
});

// Method to deactivate a user
userSchema.methods.deactivate = async function () {
  this.isActive = false;
  await this.save();
};

// Method to activate a user
userSchema.methods.activate = async function () {
  this.isActive = true;
  await this.save();
};

/**
 * @typedef User
 */
const User = mongoose.model('User', userSchema);

module.exports = User;
