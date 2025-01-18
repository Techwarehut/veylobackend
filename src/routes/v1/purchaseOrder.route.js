const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const purchaseOrderValidation = require('../../validations/purchaseOrder.validation');
const purchaseOrderController = require('../../controllers/purchaseOrder.controller');

const router = express.Router();

router
  .route('/')
  .post(validate(purchaseOrderValidation.createPurchaseOrder), purchaseOrderController.createPurchaseOrder)
  .get(validate(purchaseOrderValidation.getPurchaseOrders), purchaseOrderController.getPurchaseOrders);

router
  .route('/:purchaseOrderId')
  .get(validate(purchaseOrderValidation.getPurchaseOrder), purchaseOrderController.getPurchaseOrder)
  .patch(validate(purchaseOrderValidation.updatePurchaseOrder), purchaseOrderController.updatePurchaseOrder)
  .delete(
    auth('deletePurchaseOrders'),
    validate(purchaseOrderValidation.deletePurchaseOrder),
    purchaseOrderController.deletePurchaseOrder
  );

// Endpoint to update the status of a purchase order
router
  .route('/:purchaseOrderId/status')
  .post(auth('approvePurchaseOrders'), validate(purchaseOrderValidation.updateStatus), purchaseOrderController.updateStatus);

// Endpoint to fetch all purchase orders for a specific customer
router
  .route('/customer/:customerId')
  .get(validate(purchaseOrderValidation.getPurchaseOrdersByCustomer), purchaseOrderController.getPurchaseOrdersByCustomer);

// Endpoint to add an item to a purchase order
router
  .route('/:purchaseOrderId/items')
  .post(validate(purchaseOrderValidation.addItemToPurchaseOrder), purchaseOrderController.addItemToPurchaseOrder);

// Endpoint to remove an item from a purchase order
router
  .route('/:purchaseOrderId/items/:itemId')
  .delete(
    validate(purchaseOrderValidation.removeItemFromPurchaseOrder),
    purchaseOrderController.removeItemFromPurchaseOrder
  );

// Endpoint to link a job to a purchase order
router
  .route('/:purchaseOrderId/job')
  .patch(validate(purchaseOrderValidation.addJobToPurchaseOrder), purchaseOrderController.addJobToPurchaseOrder);

// Endpoint to unlink a job from a purchase order
router
  .route('/:purchaseOrderId/job')
  .delete(validate(purchaseOrderValidation.removeJobFromPurchaseOrder), purchaseOrderController.removeJobFromPurchaseOrder);

module.exports = router;
