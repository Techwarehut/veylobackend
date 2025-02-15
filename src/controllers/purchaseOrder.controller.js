const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { purchaseOrderService, pdfService, emailService } = require('../services');
const { PurchaseOrder } = require('../models');

const mongoose = require('mongoose');

// Create a new purchase order
const createPurchaseOrder = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantID;

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
    requestedBy: req.user.id,
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
  const { searchText, status } = req.query;
  const filter = pick(req.query, ['vendor', 'status', 'customer', 'jobID']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  // Assuming the logged-in user's ID is stored in req.user
  const userId = req.user.id;
  filter.tenantId = req.user.tenantID;

  // Add filter to ensure only purchase orders requested by the user are returned
  if (req.user.role === 'member') filter.requestedBy = userId;

  if (!options.sortBy) {
    options.sortBy = '-createdAt'; // Default sorting by creation date
  }

  options.limit = Math.min(parseInt(options.limit, 10) || 4, 10); // Cap limit to 100

  options.page = parseInt(options.page, 10) || 1; // Default page to 1

  // Handle multiple statuses (comma-separated values)
  if (status) {
    const statusArray = status.split(','); // Convert status string to an array
    filter.status = { $in: statusArray }; // Use $in operator for multiple statuses
  }

  // Add search logic if searchText exists
  if (searchText) {
    const searchRegex = new RegExp(searchText, 'i'); // Case-insensitive regex for search
    filter.$or = [
      { purchaseOrderNumber: searchRegex },
      //{ 'vendor.companyName': searchRegex },
      // { jobID: searchRegex },
      { 'items.itemName': searchRegex }, // Assuming `items` is an array with `itemName`
    ];
  }

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
    results: populatedResult,
    totalResults: result.totalResults,
    totalPages: result.totalPages,
    currentPage: options.page,
  });
  /*  res.send({
    ...result,
    results: populatedResult,
  }); */
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
  const { status } = req.body;
  const userId = req.user.id;

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

  const purchaseOrder = await purchaseOrderService.addItemToPurchaseOrder(purchaseOrderId, req.body);

  // Find the purchase order by ID
  //const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId);
  if (!purchaseOrder) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found');
  }

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

  const purchaseOrder = await purchaseOrderService.removeItemFromPurchaseOrder(purchaseOrderId, id);
  // Find the purchase order by ID
  //const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId);
  if (!purchaseOrder) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found');
  }

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

  const purchaseOrder = await purchaseOrderService.addJobToPurchaseOrder(purchaseOrderId, jobID);
  // Find the purchase order by ID
  //const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId);
  if (!purchaseOrder) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found');
  }

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

  const purchaseOrder = await purchaseOrderService.removeJobFromPurchaseOrder(purchaseOrderId);
  // Find the purchase order by ID
  // const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId);
  if (!purchaseOrder) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found');
  }

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

/**
 * Generate a PDF for the purchase order and send it for frontend download
 * @param {Object} req
 * @param {Object} res
 * @returns {Promise}
 */
const generatePDF = catchAsync(async (req, res) => {
  const { purchaseOrderId } = req.params;

  // Fetch the purchase order details
  const purchaseOrder = await purchaseOrderService.getPurchaseOrderById(purchaseOrderId);
  if (!purchaseOrder) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found');
  }

  // Populate the updated purchase order with references
  const populatedResult = await PurchaseOrder.populate(purchaseOrder, [
    { path: 'vendor' },
    /*  { path: 'requestedBy' },
    { path: 'approvedBy' },
    { path: 'Customer' }, */
    { path: 'tenantId' },
  ]);

  // Generate the PDF content using the PDF service
  const pdfBuffer = await pdfService.generatePurchaseOrderPDF(populatedResult);

  // Set response headers for downloading the PDF
  res.setHeader('Content-Disposition', `attachment; filename=purchase-order-${purchaseOrder.purchaseOrderNumber}.pdf`);
  res.setHeader('Content-Type', 'application/pdf');

  // Send the PDF buffer as the response
  res.send(pdfBuffer);
});

/**
 * Send the purchase order PDF to the vendor via email
 * @param {Object} req
 * @param {Object} res
 * @returns {Promise}
 */
const sendPDFToVendor = catchAsync(async (req, res) => {
  const { purchaseOrderId } = req.params;

  // Fetch the purchase order details
  const purchaseOrder = await purchaseOrderService.getPurchaseOrderById(purchaseOrderId);
  if (!purchaseOrder) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found');
  }

  // Populate the updated purchase order with references
  const populatedResult = await PurchaseOrder.populate(purchaseOrder, [
    { path: 'vendor' },
    { path: 'requestedBy' },
    { path: 'approvedBy' },
    { path: 'Customer' },
  ]);

  // Check if the vendor email is available
  const vendorEmail = populatedResult.vendor.contactPerson.email;
  if (!vendorEmail) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Vendor email not available');
  }

  // Send the purchase order email
  try {
    await emailService.sendPurchaseOrderEmail(populatedResult);
    // Respond to the client
    res.status(httpStatus.OK).send({ message: 'Email sent successfully to the vendor.' });
  } catch (error) {
    // Log the error (you can use a logger here)
    console.error('Error sending email:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to send the email');
  }
});

const getUniqueCustomers = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantID;
  const result = await PurchaseOrder.aggregate([
    {
      $lookup: {
        from: 'customers', // Name of the collection where customers are stored
        let: { customerId: '$customer' }, // Pass the customer ObjectId from PurchaseOrder
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$_id', '$$customerId'] }, // Match on customer ID
                  { $eq: ['$tenantId', tenantId] }, // Match on tenantId
                ],
              },
            },
          },
        ],
        as: 'customerDetails',
      },
    },
    {
      $unwind: {
        path: '$customerDetails',
        preserveNullAndEmptyArrays: true, // Keep entries without a customer assigned
      },
    },
    {
      $project: {
        'customerDetails._id': 1, // Include customer ID
        'customerDetails.businessName': 1, // Only include businessName from customer
      },
    },
    {
      $group: {
        _id: null,
        customers: {
          $addToSet: {
            _id: { $ifNull: ['$customerDetails._id', null] }, // Use customer ID if available, null otherwise
            businessName: { $ifNull: ['$customerDetails.businessName', 'Unassigned'] }, // Use businessName or fallback to 'Unassigned'
          },
        },
      },
    },
  ]);

  res.send({
    customers: result[0]?.customers || [],
  });
});

const getUniqueVendors = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantID;
  const result = await PurchaseOrder.aggregate([
    {
      $lookup: {
        from: 'vendors', // Name of the collection where vendors are stored
        let: { vendorId: '$vendor' }, // Pass the vendor ObjectId from PurchaseOrder
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$_id', '$$vendorId'] }, // Match on vendor ID
                  { $eq: ['$tenantId', tenantId] }, // Match on tenantId
                ],
              },
            },
          },
        ],
        as: 'vendorDetails',
      },
    },
    {
      $unwind: {
        path: '$vendorDetails',
        preserveNullAndEmptyArrays: true, // Keep entries without a vendor assigned
      },
    },
    {
      $project: {
        'vendorDetails._id': 1, // Include vendor ID
        'vendorDetails.companyName': 1, // Only include companyName from vendor
      },
    },
    {
      $group: {
        _id: null,
        vendors: {
          $addToSet: {
            _id: { $ifNull: ['$vendorDetails._id', null] }, // Use vendor ID if available, null otherwise
            companyName: { $ifNull: ['$vendorDetails.companyName', 'Unassigned'] }, // Use companyName or fallback to 'Unassigned'
          },
        },
      },
    },
  ]);

  res.send({
    vendors: result[0]?.vendors || [],
  });
});

const getUniqueJobs = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantID;
  const result = await PurchaseOrder.aggregate([
    {
      $lookup: {
        from: 'vendors', // Name of the collection where vendors are stored
        let: { vendorId: '$vendor' }, // Pass the vendor ObjectId from PurchaseOrder
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$_id', '$$vendorId'] }, // Match on vendor ID
                  { $eq: ['$tenantId', tenantId] }, // Match on tenantId
                ],
              },
            },
          },
        ],
        as: 'vendorDetails',
      },
    },
    {
      $unwind: {
        path: '$vendorDetails',
        preserveNullAndEmptyArrays: true, // Keep entries without a vendor assigned
      },
    },
    {
      $project: {
        'vendorDetails.companyName': 1, // Only include companyName from vendor
      },
    },
    {
      $group: {
        _id: null,
        vendors: {
          $addToSet: {
            $ifNull: [
              '$vendorDetails.companyName', // Use vendor companyName if available
              'Unassigned', // Fallback to 'Unassigned' if no vendor is assigned
            ],
          },
        },
      },
    },
  ]);

  res.send({
    vendors: result[0]?.vendors || [],
  });
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
  generatePDF,
  sendPDFToVendor,
  getUniqueCustomers,
  getUniqueVendors,
  getUniqueJobs,
};
