const mongoose = require('mongoose');

const checklistSchema = mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true }, // Reference to Tenant
    checklist_name: { type: String, required: true }, // Name of the checklist
    tasks: [
      {
        task_id: { type: String, required: true }, // Unique task ID
        task_name: { type: String, required: true }, // Task description
        status: { type: String, enum: ['pending', 'completed'], default: 'pending' }, // Task status
      },
    ],
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

//checklistSchema.plugin(toJSON);

const Checklist = mongoose.model('Checklist', checklistSchema);
module.exports = Checklist;
