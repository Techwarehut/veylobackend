const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const checklistSchema = mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true }, // Indexed for faster lookups
    checklist_name: { type: String, required: true, trim: true }, // Added trim to remove unwanted spaces
    tasks: [
      {
        task_name: { type: String, required: true, trim: true },
        status: { type: String, enum: ['pending', 'completed'], default: 'pending', trim: true },
        createdAt: { type: Date, default: Date.now }, // Track task creation
      },
    ],
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

// Add plugins for JSON conversion and pagination
checklistSchema.plugin(toJSON);
checklistSchema.plugin(paginate);

const Checklist = mongoose.model('Checklist', checklistSchema);
module.exports = Checklist;
