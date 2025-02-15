const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const checklistValidation = require('../../validations/checklist.validation');
const checklistController = require('../../controllers/checklist.controller');

const router = express.Router();

router
  .route('/')
  .post(auth('manageChecklists'), validate(checklistValidation.createChecklist), checklistController.createChecklist)
  .get(auth('getChecklists'), validate(checklistValidation.getChecklists), checklistController.getChecklists);

router
  .route('/:checklistId')
  .get(auth('getChecklists'), validate(checklistValidation.getChecklist), checklistController.getChecklist)
  .patch(auth('manageChecklists'), validate(checklistValidation.updateChecklist), checklistController.updateChecklist)
  .delete(auth('manageChecklists'), validate(checklistValidation.deleteChecklist), checklistController.deleteChecklist);

router
  .route('/:checklistId/tasks')
  .post(auth('manageChecklists'), validate(checklistValidation.addTask), checklistController.addTask)
  .get(auth('getChecklists'), validate(checklistValidation.getTasks), checklistController.getTasks);

router
  .route('/:checklistId/tasks/:taskId')
  .patch(auth('manageChecklists'), validate(checklistValidation.updateTask), checklistController.updateTask)
  .delete(auth('manageChecklists'), validate(checklistValidation.deleteTask), checklistController.deleteTask);

module.exports = router;
