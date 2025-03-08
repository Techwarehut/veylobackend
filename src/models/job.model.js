const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const { number } = require('joi');

// Define the Comment schema
const commentSchema = mongoose.Schema(
  {
    text: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Define the HoursSpent schema
const hoursSpentSchema = mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hours: { type: Number, required: true },
  notes: { type: String, required: true },
});

// Define the JobRecurrence schema
const jobRecurrenceSchema = mongoose.Schema({
  type: { type: String, required: true, default: 'none' },
  daysOfWeek: { type: String, default: '' },
  completedIterations: { type: Number, default: 0 },
  totalIterations: { type: Number, default: 0 },
  dueDates: { type: [Date], default: [new Date()] },
});

// Define the Job schema
const jobSchema = mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant', // Reference to the Tenant model
      required: true,
      index: true,
    },
    jobNumber: {
      type: String,
      default: null,

      trim: true,
    },
    jobTitle: { type: String, required: true, trim: true },
    jobDescription: { type: String, required: true, trim: true },
    jobType: {
      type: String,
      required: true,
      validate: {
        validator: async function (value) {
          if (!this.tenantId) return false; // Ensure tenantId is available

          const jobTypeDoc = await mongoose.models.JobType.findOne({
            tenantId: this.tenantId,
            job_types: value, // Check if this job type exists in the array
          });

          return !!jobTypeDoc;
        },
        message: 'Invalid job type for this tenant.',
      },
    },

    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, required: true },
    label: { type: String, trim: true },
    dueDate: { type: Date, required: true },
    priority: { type: String, required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    siteLocation: { type: mongoose.Schema.Types.ObjectId, ref: 'SiteLocation', required: true },
    estimateId: { type: String },
    invoiceId: { type: String },
    comments: [commentSchema],
    hoursSpent: [hoursSpentSchema],
    images: [{ type: String }],
    checklistID: { type: String },
    recurrence: {
      type: jobRecurrenceSchema,
      default: () => ({
        type: 'none',
        daysOfWeek: '',
        completedIterations: 0,
        totalIterations: 0,
        dueDates: [new Date()],
      }),
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Compound index for filtering by vendor, status, and sorting by createdAt
jobSchema.index({
  tenantId: 1,
  customer: 1,
  label: 1,
  assignedTo: 1,
  status: 1,
  jobType: 1,
  createdAt: -1,
  dueDate: 1,
  priority: 1,
});

// Add plugins for JSON conversion and pagination
jobSchema.plugin(toJSON);
jobSchema.plugin(paginate);

jobSchema.pre('save', async function (next) {
  const customer = await this.model('Customer').findOne({
    _id: this.customer,
    siteLocations: { $elemMatch: { _id: this.siteLocation } }, // Ensuring siteLocation belongs to this customer
  });

  if (!customer) {
    return next(new Error('Site location must belong to the selected customer.'));
  }

  next();
});

/**
 * @typedef Job
 */
const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
