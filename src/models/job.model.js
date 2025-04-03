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
  notes: { type: String },
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
    jobTitle: { type: String, trim: true },
    jobDescription: { type: String, trim: true },
    jobType: {
      type: String,
      //required: true,
      /*  validate: {
        validator: async function (value) {
          if (!this.tenantId) return false; // Ensure tenantId is available

          const jobTypeDoc = await mongoose.models.JobType.findOne({
            tenantId: this.tenantId,
            job_types: value, // Check if this job type exists in the array
          });

          return !!jobTypeDoc;
        },
        message: 'Invalid job type for this tenant.',
      }, */
    },

    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, required: true },
    label: { type: String, trim: true },
    dueDate: { type: Date, required: true },
    priority: { type: String, required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    siteLocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'SiteLocation' },
    siteLocation: {
      type: new mongoose.Schema({
        siteName: String,
        siteContactPerson: String,
        siteContactPhone: String,
        AddressLine: String,
        City: String,
        Province: String,
        zipcode: String,
        _id: mongoose.Schema.Types.ObjectId,
      }),
      default: null,
    },

    estimateId: { type: String },
    invoiceId: { type: String },
    comments: [commentSchema],
    hoursSpent: [hoursSpentSchema],
    images: [{ type: String }],
    checklist: {
      checklistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Checklist' },
      checklist_name: { type: String, trim: true },
      tasks: [
        {
          task_name: { type: String, required: true, trim: true },
          status: { type: String, enum: ['pending', 'completed'], default: 'pending', trim: true },
        },
      ],
    },
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
  // If customer is null or undefined, skip the check
  if (!this.customer) {
    return next();
  }

  try {
    const customer = await this.model('Customer').findOne({
      _id: this.customer,
      siteLocations: { $elemMatch: { _id: this.siteLocationId } }, // Ensuring siteLocation belongs to this customer
    });

    if (!customer) {
      return next(new Error('Site location must belong to the selected customer.'));
    }

    next();
  } catch (error) {
    next(error); // Pass any errors to Mongoose error handler
  }
});

/**
 * @typedef Job
 */
const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
