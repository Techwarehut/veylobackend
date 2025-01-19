const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { purchaseOrderService } = require('../services');
const { PurchaseOrder } = require('../models');
const mongoose = require('mongoose');

// Create a new purchase order
const createPurchaseOrder = catchAsync(async (req, res) => {
  const tenantId = req.query.tenantId;

  if (!tenantId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Tenant ID is required');
  }

  // Step 1: Find the highest purchaseOrderNumber for the tenantId
  const lastPurchaseOrder = await PurchaseOrder.findOne({ tenantId })
    .sort({ purchaseOrderNumber: -1 }) // Sort in descending order
    .select('purchaseOrderNumber') // Select only the field we need
    .lean(); // Use lean to avoid fetching full Mongoose objects

  // Step 2: Generate the next purchaseOrderNumber
  let newPurchaseOrderNumber;
  if (lastPurchaseOrder && lastPurchaseOrder.purchaseOrderNumber) {
    // Increment the last purchaseOrderNumber by 1
    newPurchaseOrderNumber = String(parseInt(lastPurchaseOrder.purchaseOrderNumber) + 1).padStart(4, '0'); // Ensure it's zero-padded to 4 digits
  } else {
    // If no purchaseOrder exists, start with '0001'
    newPurchaseOrderNumber = '0001';
  }

  // Step 3: Add the new purchaseOrderNumber to the payload
  const purchaseOrderData = {
    ...req.body,
    tenantId,
    purchaseOrderNumber: newPurchaseOrderNumber,
  };

  // Step 4: Create the purchase order
  const purchaseOrder = await purchaseOrderService.createPurchaseOrder(purchaseOrderData);
  // Populate references (if required)
  const populatedResult = await PurchaseOrder.populate(purchaseOrder, [
    { path: 'vendor', select: 'id companyName' },
    { path: 'requestedBy', select: 'id name profileUrl' },
    { path: 'approvedBy', select: 'id name profileUrl' },
    { path: 'Customer', select: 'id  businessName' },
    // { path: 'jobID', select: 'jobTitle jobCode' },
  ]);

  res.status(httpStatus.CREATED).send(populatedResult);
});

// Get all purchase orders with optional filters and pagination
const getPurchaseOrders = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['vendorId', 'status', 'tenantId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  if (!options.sortBy) {
    options.sortBy = 'createdAt'; // Default sorting by creation date
  }

  //options.limit = parseInt(options.limit, 10) || 10; // Default limit to 10
  // options.page = parseInt(options.page, 10) || 1; // Default page to 1

  const result = await purchaseOrderService.queryPurchaseOrders(filter, options);

  // Populate references (if required)
  const populatedResult = await PurchaseOrder.populate(result.results, [
    { path: 'vendor', select: 'id companyName' },
    { path: 'requestedBy', select: 'id name profileUrl' },
    { path: 'approvedBy', select: 'id name profileUrl' },
    { path: 'Customer', select: 'id  businessName' },
    // { path: 'jobID', select: 'jobTitle jobCode' },
  ]);

  // Respond with the results
  res.send({
    ...result,
    results: populatedResult,
  });
});

// Get a specific purchase order by ID
const getPurchaseOrder = catchAsync(async (req, res) => {
  const purchaseOrder = await purchaseOrderService.getPurchaseOrderById(req.params.purchaseOrderId);
  if (!purchaseOrder) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found');
  }
  res.send(purchaseOrder);
});

// Update a purchase order by ID
const updatePurchaseOrder = catchAsync(async (req, res) => {
  const purchaseOrder = await purchaseOrderService.updatePurchaseOrderById(req.params.purchaseOrderId, req.body);

  // Populate references (if required)
  const populatedResult = await PurchaseOrder.populate(purchaseOrder, [
    { path: 'vendor', select: 'id companyName' },
    { path: 'requestedBy', select: 'id name profileUrl' },
    { path: 'approvedBy', select: 'id name profileUrl' },
    { path: 'Customer', select: 'id  businessName' },
    // { path: 'jobID', select: 'jobTitle jobCode' },
  ]);

  res.send(populatedResult);
});

// Delete a purchase order by ID
const deletePurchaseOrder = catchAsync(async (req, res) => {
  await purchaseOrderService.deletePurchaseOrderById(req.params.purchaseOrderId);
  res.status(httpStatus.NO_CONTENT).send();
});

// Update the status of a purchase order
const updateStatus = catchAsync(async (req, res) => {
  const { purchaseOrderId } = req.params;
  const { status, userId } = req.body;

  const purchaseOrder = await purchaseOrderService.updatePurchaseOrderStatus(purchaseOrderId, status, userId);

  if (!purchaseOrder) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found');
  }

  // Populate references (if required)
  const populatedResult = await PurchaseOrder.populate(purchaseOrder, [
    { path: 'vendor', select: 'id companyName' },
    { path: 'requestedBy', select: 'id name profileUrl' },
    { path: 'approvedBy', select: 'id name profileUrl' },
    { path: 'Customer', select: 'id  businessName' },
    // { path: 'jobID', select: 'jobTitle jobCode' },
  ]);

  res.send(populatedResult);
});

// Get purchase orders for a specific customer
const getPurchaseOrdersByCustomer = catchAsync(async (req, res) => {
  const customerId = req.params.customerId;
  const filter = pick(req.query, ['status']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  if (!options.sortBy) {
    options.sortBy = 'createdAt';
  }

  const result = await purchaseOrderService.queryPurchaseOrdersByCustomer(customerId, filter, options);

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No purchase orders found for the customer');
  }

  res.send(result);
});

// Add a new item to a purchase order
const addItemToPurchaseOrder = catchAsync(async (req, res) => {
  const { purchaseOrderId } = req.params;
  const { itemName, quantity, price } = req.body;

  // Validate input
  if (!itemName || quantity <= 0 || price < 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid item details');
  }

  // Find the purchase order by ID
  const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId);
  if (!purchaseOrder) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found');
  }

  // Create a new purchase order item
  const newItem = { itemName, quantity, price };

  // Add the new item to the items array
  purchaseOrder.items.push(newItem);

  // Recalculate the total
  purchaseOrder.total += price * quantity;

  // Save the updated purchase order
  await purchaseOrder.save();

  // Populate the updated purchase order with references
  const populatedResult = await PurchaseOrder.populate(purchaseOrder, [
    { path: 'vendor', select: 'id companyName' },
    { path: 'requestedBy', select: 'id name profileUrl' },
    { path: 'approvedBy', select: 'id name profileUrl' },
    { path: 'Customer', select: 'id businessName' },
  ]);

  res.send(populatedResult);
});

// Remove an item from a purchase order
const removeItemFromPurchaseOrder = catchAsync(async (req, res) => {
  const { purchaseOrderId, id } = req.params;

  // Find the purchase order by ID
  const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId);
  if (!purchaseOrder) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found');
  }

  // Find and remove the item from the items array

  const itemIndex = purchaseOrder.items.findIndex((item) => item._id.equals(mongoose.Types.ObjectId(id)));
  if (itemIndex === -1) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Item not found in this purchase order');
  }

  // Subtract the item cost from the total before removing
  const itemToRemove = purchaseOrder.items[itemIndex];
  purchaseOrder.total -= itemToRemove.price * itemToRemove.quantity;

  // Remove the item from the array
  purchaseOrder.items.splice(itemIndex, 1);

  // Save the updated purchase order
  await purchaseOrder.save();

  // Populate the updated purchase order with references
  const populatedResult = await PurchaseOrder.populate(purchaseOrder, [
    { path: 'vendor', select: 'id companyName' },
    { path: 'requestedBy', select: 'id name profileUrl' },
    { path: 'approvedBy', select: 'id name profileUrl' },
    { path: 'Customer', select: 'id businessName' },
  ]);

  res.send(populatedResult);
});

// Add a job to a purchase order
const addJobToPurchaseOrder = catchAsync(async (req, res) => {
  const { purchaseOrderId } = req.params;
  const { jobID } = req.body;

  // Find the purchase order by ID
  const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId);
  if (!purchaseOrder) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found');
  }

  // Update the jobID field in the purchase order
  purchaseOrder.jobID = jobID;

  // Save the updated purchase order
  await purchaseOrder.save();

  // Populate the updated purchase order with references
  const populatedResult = await PurchaseOrder.populate(purchaseOrder, [
    { path: 'vendor', select: 'id companyName' },
    { path: 'requestedBy', select: 'id name profileUrl' },
    { path: 'approvedBy', select: 'id name profileUrl' },
    { path: 'Customer', select: 'id businessName' },
    { path: 'jobID', select: 'jobTitle jobCode' }, // Optionally populate job details
  ]);

  res.send(populatedResult);
});

// Remove job from a purchase order
const removeJobFromPurchaseOrder = catchAsync(async (req, res) => {
  const { purchaseOrderId } = req.params;

  // Find the purchase order by ID
  const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId);
  if (!purchaseOrder) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found');
  }

  // Set the jobID to null to unlink the job
  purchaseOrder.jobID = null;

  // Save the updated purchase order
  await purchaseOrder.save();

  // Populate the updated purchase order with references
  const populatedResult = await PurchaseOrder.populate(purchaseOrder, [
    { path: 'vendor', select: 'id companyName' },
    { path: 'requestedBy', select: 'id name profileUrl' },
    { path: 'approvedBy', select: 'id name profileUrl' },
    { path: 'Customer', select: 'id businessName' },
    { path: 'jobID', select: 'jobTitle jobCode' }, // Optionally populate job details
  ]);

  res.send(populatedResult);
});

module.exports = {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  updateStatus,
  getPurchaseOrdersByCustomer,
  addItemToPurchaseOrder, // Add new item to a purchase order
  removeItemFromPurchaseOrder, // Remove item from a purchase order
  addJobToPurchaseOrder, // Link a job to a purchase order
  removeJobFromPurchaseOrder, // Unlink a job from a purchase order
};
