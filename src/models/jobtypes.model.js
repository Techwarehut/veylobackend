const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const jobTypeSchema = mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    }, // Indexed for faster lookups

    job_types: {
      type: [String],
      default: ['Inspection', 'Service', 'Maintenance', 'Support'],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'Job types must be a non-empty array of strings.',
      },
    },
  },
  { timestamps: true }
);

// Add plugins for JSON conversion and pagination
jobTypeSchema.plugin(toJSON);
jobTypeSchema.plugin(paginate);

const JobTypes = mongoose.model('JobType', jobTypeSchema);
module.exports = JobTypes;
