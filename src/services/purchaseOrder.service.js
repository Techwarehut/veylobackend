const httpStatus = require('http-status');
const { PurchaseOrder } = require('../models');
const ApiError = require('../utils/ApiError');
const mongoose = require('mongoose');

/**
 * Create a purchase order
 * @param {Object} purchaseOrderBody
 * @returns {Promise<PurchaseOrder>}
 */
const createPurchaseOrder = async (purchaseOrderBody) => {
  return PurchaseOrder.create(purchaseOrderBody);
};

/**
 * Query for purchase orders
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryPurchaseOrders = async (filter, options) => {
  return PurchaseOrder.paginate(filter, options);
};

/**
 * Get purchase order by ID
 * @param {ObjectId} id
 * @returns {Promise<PurchaseOrder>}
 */
const getPurchaseOrderById = async (id) => {
  const purchaseOrder = await PurchaseOrder.findById(id);
  if (!purchaseOrder) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found');
  }
  return purchaseOrder;
};

/**
 * Update purchase order by ID
 * @param {ObjectId} purchaseOrderId
 * @param {Object} updateBody
 * @returns {Promise<PurchaseOrder>}
 */
const updatePurchaseOrderById = async (purchaseOrderId, updateBody) => {
  const purchaseOrder = await getPurchaseOrderById(purchaseOrderId);
  Object.assign(purchaseOrder, updateBody);
  await purchaseOrder.save();
  return purchaseOrder;
};

/**
 * Delete purchase order by ID
 * @param {ObjectId} purchaseOrderId
 * @returns {Promise<PurchaseOrder>}
 */
const deletePurchaseOrderById = async (purchaseOrderId) => {
  const purchaseOrder = await getPurchaseOrderById(purchaseOrderId);
  await purchaseOrder.remove();
  return purchaseOrder;
};

/**
 * Update the status of a purchase order
 * @param {ObjectId} purchaseOrderId
 * @param {string} status
 * @returns {Promise<PurchaseOrder>}
 */
const updatePurchaseOrderStatus = async (purchaseOrderId, status, userId) => {
  const purchaseOrder = await getPurchaseOrderById(purchaseOrderId);
  purchaseOrder.status = status;

  // If status is 'Approved' or 'Rejected', store the userId in approvedBy
  if (status === 'Approved' || status === 'Rejected') {
    purchaseOrder.approvedBy = mongoose.Types.ObjectId(userId); // Ensure userId is ObjectId type
  }

  await purchaseOrder.save();
  return purchaseOrder;
};

/**
 * Query purchase orders by customer ID
 * @param {ObjectId} customerId
 * @param {Object} filter - Additional filters
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryPurchaseOrdersByCustomer = async (customerId, filter, options) => {
  filter.customerId = customerId;
  return PurchaseOrder.paginate(filter, options);
};

/**
 * Add an item to a purchase order
 * @param {ObjectId} purchaseOrderId
 * @param {Object} itemData - The data of the item to add
 * @returns {Promise<PurchaseOrder>}
 */
const addItemToPurchaseOrder = async (purchaseOrderId, itemData) => {
  const purchaseOrder = await getPurchaseOrderById(purchaseOrderId);

  // Add the new item to the items array
  purchaseOrder.items.push(itemData);

  // Recalculate the total price
  purchaseOrder.total += itemData.price * itemData.quantity;

  await purchaseOrder.save();
  return purchaseOrder;
};

/**
 * Remove an item from a purchase order
 * @param {ObjectId} purchaseOrderId
 * @param {ObjectId} itemId - The item ID to remove
 * @returns {Promise<PurchaseOrder>}
 */
const removeItemFromPurchaseOrder = async (purchaseOrderId, itemId) => {
  const purchaseOrder = await getPurchaseOrderById(purchaseOrderId);

  // Find and remove the item from the items array
  const itemIndex = purchaseOrder.items.findIndex((item) => item._id.equals(mongoose.Types.ObjectId(itemId)));
  if (itemIndex === -1) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Item not found in this purchase order');
  }

  // Subtract the item's price from the total before removing it
  const itemToRemove = purchaseOrder.items[itemIndex];

  purchaseOrder.total -= itemToRemove.price * itemToRemove.quantity;

  // Remove the item from the items array
  purchaseOrder.items.splice(itemIndex, 1);

  await purchaseOrder.save();
  return purchaseOrder;
};

/**
 * Link a job to a purchase order
 * @param {ObjectId} purchaseOrderId
 * @param {ObjectId} jobId - The job ID to link
 * @returns {Promise<PurchaseOrder>}
 */
const addJobToPurchaseOrder = async (purchaseOrderId, jobId) => {
  const purchaseOrder = await getPurchaseOrderById(purchaseOrderId);

  // Link the job to the purchase order by updating the jobID
  purchaseOrder.jobID = jobId;

  await purchaseOrder.save();
  return purchaseOrder;
};

/**
 * Unlink a job from a purchase order
 * @param {ObjectId} purchaseOrderId
 * @returns {Promise<PurchaseOrder>}
 */
const removeJobFromPurchaseOrder = async (purchaseOrderId) => {
  const purchaseOrder = await getPurchaseOrderById(purchaseOrderId);

  // Unlink the job by setting jobID to null
  purchaseOrder.jobID = null;

  await purchaseOrder.save();
  return purchaseOrder;
};

module.exports = {
  createPurchaseOrder,
  queryPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrderById,
  deletePurchaseOrderById,
  updatePurchaseOrderStatus,
  queryPurchaseOrdersByCustomer,
  addItemToPurchaseOrder, // Add an item to a purchase order
  removeItemFromPurchaseOrder, // Remove an item from a purchase order
  addJobToPurchaseOrder, // Link a job to a purchase order
  removeJobFromPurchaseOrder, // Unlink a job from a purchase order
};
