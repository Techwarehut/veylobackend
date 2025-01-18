const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

// Define the PurchaseOrderItem schema
const purchaseOrderItemSchema = mongoose.Schema({
  itemName: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
});

// Define the PurchaseOrder schema
const purchaseOrderSchema = mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant', // Reference to the Tenant model
      required: true,
      index: true,
    },
    purchaseOrderNumber: {
      type: String,
      default: null,

      trim: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor', // Reference to the User model
      default: null,
    }, // Embedded vendor details
    items: [purchaseOrderItemSchema], // Array of items
    status: {
      type: String,
      enum: ['Request', 'Approved', 'Issued', 'Rejected'],
      required: true,
      default: 'Request',
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    jobID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job', // Reference to the Job model
      default: null,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the User model
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the User model
      default: null,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer', // Reference to the Customer model
      default: null,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Add plugins for JSON conversion and pagination
purchaseOrderSchema.plugin(toJSON);
purchaseOrderSchema.plugin(paginate);

/**
 * @typedef PurchaseOrder
 */
const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

module.exports = PurchaseOrder;
