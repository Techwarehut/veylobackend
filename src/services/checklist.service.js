const httpStatus = require('http-status');
const { Checklist } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a checklist
 * @param {Object} checklistBody
 * @returns {Promise<Checklist>}
 */
const createChecklist = async (checklistBody) => {
  return Checklist.create(checklistBody);
};

/**
 * Query for checklists
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryChecklists = async (filter, options) => {
  const checklists = await Checklist.paginate(filter, options);
  return checklists;
};

/**
 * Get checklist by id
 * @param {ObjectId} id
 * @returns {Promise<Checklist>}
 */
const getChecklistById = async (id) => {
  return Checklist.findById(id);
};

/**
 * Update checklist by id
 * @param {ObjectId} checklistId
 * @param {Object} updateBody
 * @returns {Promise<Checklist>}
 */
const updateChecklistById = async (checklistId, updateBody) => {
  const checklist = await getChecklistById(checklistId);
  if (!checklist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Checklist not found');
  }
  Object.assign(checklist, updateBody);
  await checklist.save();
  return checklist;
};

/**
 * Delete checklist by id
 * @param {ObjectId} checklistId
 * @returns {Promise<Checklist>}
 */
const deleteChecklistById = async (checklistId) => {
  const checklist = await getChecklistById(checklistId);
  if (!checklist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Checklist not found');
  }
  await checklist.remove();
  return checklist;
};

/**
 * Add task to checklist
 * @param {ObjectId} checklistId
 * @param {Object} task
 * @returns {Promise<Checklist>}
 */
const addTask = async (checklistId, task) => {
  const checklist = await getChecklistById(checklistId);
  if (!checklist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Checklist not found');
  }
  checklist.tasks.push(task);
  await checklist.save();
  return checklist;
};

/**
 * Update task in checklist
 * @param {ObjectId} checklistId
 * @param {ObjectId} taskId
 * @param {Object} updateBody
 * @returns {Promise<Checklist>}
 */
const updateTask = async (checklistId, taskId, updateBody) => {
  const checklist = await getChecklistById(checklistId);
  if (!checklist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Checklist not found');
  }
  const task = checklist.tasks.id(taskId);
  if (!task) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Task not found');
  }
  Object.assign(task, updateBody);
  await checklist.save();
  return checklist;
};

/**
 * Delete task from checklist
 * @param {ObjectId} checklistId
 * @param {ObjectId} taskId
 * @returns {Promise<Checklist>}
 */
const deleteTask = async (checklistId, taskId) => {
  const checklist = await getChecklistById(checklistId);
  if (!checklist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Checklist not found');
  }
  checklist.tasks = checklist.tasks.filter((task) => task._id.toString() !== taskId);
  await checklist.save();
  return checklist;
};

module.exports = {
  createChecklist,
  queryChecklists,
  getChecklistById,
  updateChecklistById,
  deleteChecklistById,
  addTask,
  updateTask,
  deleteTask,
};
