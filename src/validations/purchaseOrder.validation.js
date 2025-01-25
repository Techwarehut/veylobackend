const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createPurchaseOrder = {
  body: Joi.object().keys({
    vendor: Joi.string().custom(objectId).required(),
    items: Joi.array()
      .items(
        Joi.object().keys({
          itemName: Joi.string().required(), // Item name is required
          quantity: Joi.number().integer().positive().required(), // Quantity must be a positive integer
          price: Joi.number().positive().required(), // Price must be a positive number
        })
      )
      .min(1) // At least one item is required
      .required(),
    status: Joi.string()
      .valid('Request', 'Approved', 'Issued', 'Rejected') // Status must be one of the allowed values
      .required(),
    total: Joi.number().positive().required(), // Total cost must be a positive number
    jobID: Joi.string().custom(objectId).optional().allow(null), // Job ID is required
    requestedBy: Joi.string().custom(objectId).required(), // ID of the user who requested is required
    approvedBy: Joi.string().custom(objectId).allow(null), // Approved by can be null
    customer: Joi.string().custom(objectId).optional().allow(null), // Customer ID is required
  }),
};

const getPurchaseOrders = {
  query: Joi.object().keys({
    tenantId: Joi.string().custom(objectId).required(), // Tenant ID filter
    vendor: Joi.string().custom(objectId).optional(), // Vendor ID filter
    customer: Joi.string().custom(objectId).optional(), // Vendor ID filter
    jobID: Joi.string().custom(objectId).optional(), // Vendor ID filter
    status: Joi.string().optional(), // Status filter
    searchText: Joi.string().optional(), // Pagination page
    sortBy: Joi.string().optional(), // Sorting field
    limit: Joi.number().integer().optional(), // Pagination limit
    page: Joi.number().integer().optional(), // Pagination page
  }),
};

const getPurchaseOrder = {
  params: Joi.object().keys({
    purchaseOrderId: Joi.string().custom(objectId).required(), // Purchase order ID is required
  }),
};

const updatePurchaseOrder = {
  params: Joi.object().keys({
    purchaseOrderId: Joi.string().custom(objectId).required(), // Purchase order ID is required
  }),
  body: Joi.object()
    .keys({
      vendor: Joi.string().custom(objectId).optional(),
      items: Joi.array()
        .items(
          Joi.object().keys({
            itemName: Joi.string().optional(),
            quantity: Joi.number().integer().positive().optional(),
            price: Joi.number().positive().optional(),
          })
        )
        .optional(),
      status: Joi.string().valid('Request', 'Approved', 'Issued', 'Rejected').optional(),
      total: Joi.number().positive().optional(),
      jobID: Joi.string().custom(objectId).optional(),
      requestedBy: Joi.string().custom(objectId).optional(),
      approvedBy: Joi.string().custom(objectId).allow(null).optional(),
      customer: Joi.string().custom(objectId).optional(),
      tenantId: Joi.string().custom(objectId).optional(),
    })
    .min(1), // Ensure at least one field is updated
};

const deletePurchaseOrder = {
  params: Joi.object().keys({
    purchaseOrderId: Joi.string().custom(objectId).required(), // Purchase order ID is required
  }),
};

const updateStatus = {
  params: Joi.object().keys({
    purchaseOrderId: Joi.string().custom(objectId).required(), // Purchase order ID is required
  }),
  body: Joi.object().keys({
    status: Joi.string()
      .valid('Request', 'Approved', 'Issued', 'Rejected') // Status must be one of the allowed values
      .required(),
    userId: Joi.string().custom(objectId).required(), // User ID is required
  }),
};

const getPurchaseOrdersByCustomer = {
  params: Joi.object().keys({
    customerId: Joi.string().custom(objectId).required(), // Customer ID is required
  }),
  query: Joi.object().keys({
    status: Joi.string().valid('Request', 'Approved', 'Issued', 'Rejected').optional(), // Status filter
    sortBy: Joi.string().optional(), // Sorting field
    limit: Joi.number().integer().optional(), // Pagination limit
    page: Joi.number().integer().optional(), // Pagination page
  }),
};

const addItemToPurchaseOrder = {
  params: Joi.object().keys({
    purchaseOrderId: Joi.string().custom(objectId).required(), // Purchase order ID
  }),
  body: Joi.object().keys({
    itemName: Joi.string().required(), // Item name is required
    quantity: Joi.number().integer().positive().required(), // Quantity must be positive
    price: Joi.number().positive().required(), // Price must be positive
  }),
};

const removeItemFromPurchaseOrder = {
  params: Joi.object().keys({
    purchaseOrderId: Joi.string().custom(objectId).required(), // Purchase order ID
    id: Joi.string().custom(objectId).required(), // Item ID to remove
  }),
};

const addJobToPurchaseOrder = {
  params: Joi.object().keys({
    purchaseOrderId: Joi.string().custom(objectId).required(), // Purchase order ID
  }),
  body: Joi.object().keys({
    jobID: Joi.string().custom(objectId).required(), // Job ID to link
  }),
};

const removeJobFromPurchaseOrder = {
  params: Joi.object().keys({
    purchaseOrderId: Joi.string().custom(objectId).required(), // Purchase order ID
  }),
};

const downloadEmailPurchaseOrder = {
  params: Joi.object().keys({
    purchaseOrderId: Joi.string().custom(objectId).required(), // Purchase order ID
  }),
};

module.exports = {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  updateStatus,
  getPurchaseOrdersByCustomer,
  addItemToPurchaseOrder, // Validation for adding an item
  removeItemFromPurchaseOrder, // Validation for removing an item
  addJobToPurchaseOrder, // Validation for adding a job
  removeJobFromPurchaseOrder, // Validation for removing a job
  downloadEmailPurchaseOrder,
};
