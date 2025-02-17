const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createChecklist = {
  body: Joi.object().keys({
    checklist_name: Joi.string().required(), // Checklist name is required
    tasks: Joi.array()
      .items(
        Joi.object().keys({
          task_id: Joi.string().required(), // Task ID is required
          task_name: Joi.string().required(), // Task name is required
          status: Joi.string().valid('pending', 'completed').optional(), // Status must be pending or completed
        })
      )
      .optional(), // Tasks array is optional
  }),
};

const getChecklists = {
  query: Joi.object().keys({
    checklist_name: Joi.string().optional(), // Filter by checklist name
    sortBy: Joi.string().optional(), // Sorting field
    limit: Joi.number().integer().optional(), // Pagination limit
    page: Joi.number().integer().optional(), // Pagination page
  }),
};

const getChecklist = {
  params: Joi.object().keys({
    checklistId: Joi.string().custom(objectId).required(), // Checklist ID is required
  }),
};

const updateChecklist = {
  params: Joi.object().keys({
    checklistId: Joi.string().custom(objectId).required(), // Checklist ID is required
  }),
  body: Joi.object()
    .keys({
      checklist_name: Joi.string().optional(), // Checklist name is optional
      tasks: Joi.array()
        .items(
          Joi.object().keys({
            task_id: Joi.string().optional(),
            task_name: Joi.string().optional(),
            status: Joi.string().valid('pending', 'completed').optional(),
          })
        )
        .optional(),
    })
    .min(1), // Ensure at least one field is updated
};

const deleteChecklist = {
  params: Joi.object().keys({
    checklistId: Joi.string().custom(objectId).required(), // Checklist ID is required
  }),
};

const addTask = {
  params: Joi.object().keys({
    checklistId: Joi.string().custom(objectId).required(), // Checklist ID is required
  }),
  body: Joi.object().keys({
    task_name: Joi.string().required(), // Task name is required
    status: Joi.string().valid('pending', 'completed').optional(), // Task status must be pending or completed
  }),
};

const updateTask = {
  params: Joi.object().keys({
    checklistId: Joi.string().custom(objectId).required(), // Checklist ID is required
    taskId: Joi.string().custom(objectId).required(), // Task ID is required
  }),
  body: Joi.object()
    .keys({
      task_name: Joi.string().optional(),
      status: Joi.string().valid('pending', 'completed').optional(),
    })
    .min(1), // Ensure at least one field is updated
};

const deleteTask = {
  params: Joi.object().keys({
    checklistId: Joi.string().custom(objectId).required(), // Checklist ID is required
    taskId: Joi.string().custom(objectId).required(), // Task ID is required
  }),
};

module.exports = {
  createChecklist,
  getChecklists,
  getChecklist,
  updateChecklist,
  deleteChecklist,
  addTask,
  updateTask,
  deleteTask,
};
