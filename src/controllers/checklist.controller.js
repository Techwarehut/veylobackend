const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { checklistService } = require('../services');

// Create a new checklist
const createChecklist = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantID;

  if (!tenantId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Tenant ID is required');
  }

  const checklistData = { ...req.body, tenantId };
  const checklist = await checklistService.createChecklist(checklistData);

  res.status(httpStatus.CREATED).send(checklist);
});

// Get all checklists with optional filters and pagination
const getChecklists = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['checklist_name']);
  filter.tenantId = req.user.tenantID;

  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  if (!options.sortBy) {
    options.sortBy = 'checklist_name'; // Default sorting
  }

  const result = await checklistService.queryChecklists(filter, options);

  res.send(result);
});

// Get a specific checklist by ID
const getChecklist = catchAsync(async (req, res) => {
  const checklist = await checklistService.getChecklistById(req.params.checklistId);
  if (!checklist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Checklist not found');
  }
  res.send(checklist);
});

// Update a checklist by ID
const updateChecklist = catchAsync(async (req, res) => {
  const checklist = await checklistService.updateChecklistById(req.params.checklistId, req.body);
  res.send(checklist);
});

// Delete a checklist by ID
const deleteChecklist = catchAsync(async (req, res) => {
  await checklistService.deleteChecklistById(req.params.checklistId);
  res.status(httpStatus.NO_CONTENT).send();
});

// Add a task to a checklist
const addTask = catchAsync(async (req, res) => {
  const checklist = await checklistService.addTask(req.params.checklistId, req.body);
  res.send(checklist);
});

// Get tasks from a checklist
const getTasks = catchAsync(async (req, res) => {
  const tasks = await checklistService.getTasks(req.params.checklistId);
  res.send(tasks);
});

// Update a task in a checklist
const updateTask = catchAsync(async (req, res) => {
  const checklist = await checklistService.updateTask(req.params.checklistId, req.params.taskId, req.body);
  res.send(checklist);
});

// Delete a task from a checklist
const deleteTask = catchAsync(async (req, res) => {
  await checklistService.deleteTask(req.params.checklistId, req.params.taskId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createChecklist,
  getChecklists,
  getChecklist,
  updateChecklist,
  deleteChecklist,
  addTask,
  getTasks,
  updateTask,
  deleteTask,
};
