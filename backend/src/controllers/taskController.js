const taskService = require('../services/taskService');
const { emitProjectEvent, emitUserEvent } = require('../sockets/socketHandler');

const createTask = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { listId, title, description, priority, dueDate, assigneeId, position } = req.body;

    const task = await taskService.createTask(projectId, req.user.id, {
      listId,
      title,
      description,
      priority,
      dueDate,
      assigneeId,
      position,
    });

    const io = req.app.get('io');
    emitProjectEvent(io, projectId, 'task:created', task);

    // If assigned to another user, send personal notification
    if (assigneeId && assigneeId !== req.user.id) {
      emitUserEvent(io, assigneeId, 'notification:received', {
        type: 'TASK_ASSIGNED',
        message: `${req.user.name} assigned you a task: "${task.title}"`,
        taskId: task.id,
        projectId,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

const getTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await taskService.getTaskById(id, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Task details retrieved successfully.',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await taskService.updateTask(id, req.user.id, req.body);

    const io = req.app.get('io');
    const isMove = req.body.listId !== undefined || req.body.position !== undefined;
    const eventName = isMove ? 'task:moved' : 'task:updated';

    emitProjectEvent(io, updated.projectId, eventName, updated);

    // If newly assigned
    if (req.body.assigneeId && req.body.assigneeId !== req.user.id) {
      emitUserEvent(io, req.body.assigneeId, 'notification:received', {
        type: 'TASK_ASSIGNED',
        message: `${req.user.name} assigned you to "${updated.title}"`,
        taskId: updated.id,
        projectId: updated.projectId,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await taskService.deleteTask(id, req.user.id);

    const io = req.app.get('io');
    emitProjectEvent(io, result.projectId, 'task:deleted', { taskId: id });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

// Lists controllers
const createList = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { name, position } = req.body;
    const list = await taskService.createList(projectId, req.user.id, { name, position });

    const io = req.app.get('io');
    emitProjectEvent(io, projectId, 'list:created', list);

    res.status(201).json({
      success: true,
      message: 'List created successfully.',
      data: list,
    });
  } catch (error) {
    next(error);
  }
};

const updateList = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, position } = req.body;
    const updated = await taskService.updateList(id, req.user.id, { name, position });

    const io = req.app.get('io');
    emitProjectEvent(io, updated.projectId, 'list:updated', updated);

    res.status(200).json({
      success: true,
      message: 'List updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

const deleteList = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await taskService.deleteList(id, req.user.id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTask,
  getTask,
  updateTask,
  deleteTask,
  createList,
  updateList,
  deleteList,
};
