const prisma = require('../config/prisma');
const { getProjectMembership } = require('./projectService');

/**
 * Create a new task list / Kanban column
 */
const createList = async (projectId, userId, { name, position }) => {
  const membership = await getProjectMembership(projectId, userId);
  if (!membership) {
    const error = new Error('Access denied: You are not a member of this project.');
    error.statusCode = 403;
    throw error;
  }

  if (!name || !name.trim()) {
    const error = new Error('List name is required.');
    error.statusCode = 400;
    throw error;
  }

  let listPos = position;
  if (listPos === undefined || listPos === null) {
    const count = await prisma.taskList.count({ where: { projectId } });
    listPos = count;
  }

  const list = await prisma.taskList.create({
    data: {
      projectId,
      name: name.trim(),
      position: listPos,
    },
    include: {
      tasks: true,
    },
  });

  return list;
};

/**
 * Update list title or position
 */
const updateList = async (listId, userId, { name, position }) => {
  const list = await prisma.taskList.findUnique({
    where: { id: listId },
  });

  if (!list) {
    const error = new Error('List not found.');
    error.statusCode = 404;
    throw error;
  }

  const membership = await getProjectMembership(list.projectId, userId);
  if (!membership) {
    const error = new Error('Access denied.');
    error.statusCode = 403;
    throw error;
  }

  const updated = await prisma.taskList.update({
    where: { id: listId },
    data: {
      ...(name && { name: name.trim() }),
      ...(position !== undefined && { position: Number(position) }),
    },
  });

  return updated;
};

/**
 * Delete a list
 */
const deleteList = async (listId, userId) => {
  const list = await prisma.taskList.findUnique({
    where: { id: listId },
  });

  if (!list) {
    const error = new Error('List not found.');
    error.statusCode = 404;
    throw error;
  }

  const membership = await getProjectMembership(list.projectId, userId);
  if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
    const error = new Error('Permission denied: Only owners and admins can delete lists.');
    error.statusCode = 403;
    throw error;
  }

  await prisma.taskList.delete({
    where: { id: listId },
  });

  return { message: 'List deleted successfully.' };
};

/**
 * Create a new task card inside a project list
 */
const createTask = async (projectId, userId, {
  listId,
  title,
  description,
  priority = 'MEDIUM',
  dueDate,
  assigneeId,
  position,
}) => {
  const membership = await getProjectMembership(projectId, userId);
  if (!membership) {
    const error = new Error('Access denied: You are not a member of this project.');
    error.statusCode = 403;
    throw error;
  }

  if (!title || !title.trim()) {
    const error = new Error('Task title is required.');
    error.statusCode = 400;
    throw error;
  }

  // Validate list belongs to project
  const list = await prisma.taskList.findFirst({
    where: { id: listId, projectId },
  });

  if (!list) {
    const error = new Error('Target task list not found in this project.');
    error.statusCode = 404;
    throw error;
  }

  // If assigneeId is provided, verify they are in this project
  if (assigneeId) {
    const assigneeMembership = await getProjectMembership(projectId, assigneeId);
    if (!assigneeMembership) {
      const error = new Error('Assignee must be a member of this project.');
      error.statusCode = 400;
      throw error;
    }
  }

  let taskPos = position;
  if (taskPos === undefined || taskPos === null) {
    const count = await prisma.task.count({ where: { listId } });
    taskPos = count;
  }

  const validPriority = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)
    ? priority
    : 'MEDIUM';

  const task = await prisma.task.create({
    data: {
      projectId,
      listId,
      creatorId: userId,
      assigneeId: assigneeId || null,
      title: title.trim(),
      description: description ? description.trim() : '',
      priority: validPriority,
      dueDate: dueDate ? new Date(dueDate) : null,
      position: taskPos,
    },
    include: {
      creator: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      assignee: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      list: {
        select: { id: true, name: true },
      },
      _count: {
        select: { comments: true },
      },
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      projectId,
      taskId: task.id,
      userId,
      action: 'created_task',
      details: `Created task "${task.title}" in ${list.name}`,
    },
  });

  return task;
};

/**
 * Get task details by ID with author, assignee, comments, and project context
 */
const getTaskById = async (taskId, userId) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      creator: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      assignee: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      list: {
        select: { id: true, name: true, position: true },
      },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      },
      project: {
        select: { id: true, name: true },
      },
      _count: {
        select: { comments: true },
      },
    },
  });

  if (!task) {
    const error = new Error('Task not found.');
    error.statusCode = 404;
    throw error;
  }

  const membership = await getProjectMembership(task.projectId, userId);
  if (!membership) {
    const error = new Error('Access denied: You are not a member of this project.');
    error.statusCode = 403;
    throw error;
  }

  return task;
};

/**
 * Update task properties, including moving across columns (listId) and reordering (position)
 */
const updateTask = async (taskId, userId, updateData) => {
  const existingTask = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      list: true,
      assignee: true,
    },
  });

  if (!existingTask) {
    const error = new Error('Task not found.');
    error.statusCode = 404;
    throw error;
  }

  const membership = await getProjectMembership(existingTask.projectId, userId);
  if (!membership) {
    const error = new Error('Access denied.');
    error.statusCode = 403;
    throw error;
  }

  const dataToUpdate = {};
  const activityLogs = [];

  // Title & description
  if (updateData.title !== undefined) dataToUpdate.title = updateData.title.trim();
  if (updateData.description !== undefined) dataToUpdate.description = updateData.description.trim();

  // Priority
  if (updateData.priority && ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(updateData.priority)) {
    dataToUpdate.priority = updateData.priority;
  }

  // Due date
  if (updateData.dueDate !== undefined) {
    dataToUpdate.dueDate = updateData.dueDate ? new Date(updateData.dueDate) : null;
  }

  // Assignee
  if (updateData.assigneeId !== undefined) {
    if (updateData.assigneeId) {
      const assigneeMembership = await getProjectMembership(existingTask.projectId, updateData.assigneeId);
      if (!assigneeMembership) {
        const error = new Error('Assignee must be a member of this project.');
        error.statusCode = 400;
        throw error;
      }
      dataToUpdate.assigneeId = updateData.assigneeId;
      activityLogs.push(`Assigned task to ${assigneeMembership.user.name}`);
    } else {
      dataToUpdate.assigneeId = null;
      activityLogs.push(`Unassigned task`);
    }
  }

  // Moving across columns or updating position
  if (updateData.listId && updateData.listId !== existingTask.listId) {
    const targetList = await prisma.taskList.findFirst({
      where: { id: updateData.listId, projectId: existingTask.projectId },
    });
    if (!targetList) {
      const error = new Error('Target list does not belong to this project.');
      error.statusCode = 400;
      throw error;
    }
    dataToUpdate.listId = updateData.listId;
    activityLogs.push(`Moved task from "${existingTask.list.name}" to "${targetList.name}"`);
  }

  if (updateData.position !== undefined) {
    dataToUpdate.position = Number(updateData.position);
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: dataToUpdate,
    include: {
      creator: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      assignee: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      list: {
        select: { id: true, name: true },
      },
      _count: {
        select: { comments: true },
      },
    },
  });

  // Record activity logs
  for (const logDetail of activityLogs) {
    await prisma.activityLog.create({
      data: {
        projectId: existingTask.projectId,
        taskId: existingTask.id,
        userId,
        action: 'updated_task',
        details: logDetail,
      },
    });
  }

  return updatedTask;
};

/**
 * Delete a task card
 */
const deleteTask = async (taskId, userId) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    const error = new Error('Task not found.');
    error.statusCode = 404;
    throw error;
  }

  const membership = await getProjectMembership(task.projectId, userId);
  if (!membership) {
    const error = new Error('Access denied.');
    error.statusCode = 403;
    throw error;
  }

  // Allow: Task creator, Project OWNER, or Project ADMIN
  const isCreator = task.creatorId === userId;
  const isPrivileged = membership.role === 'OWNER' || membership.role === 'ADMIN';

  if (!isCreator && !isPrivileged) {
    const error = new Error('Permission denied: You can only delete tasks you created or as a project admin/owner.');
    error.statusCode = 403;
    throw error;
  }

  await prisma.task.delete({
    where: { id: taskId },
  });

  await prisma.activityLog.create({
    data: {
      projectId: task.projectId,
      userId,
      action: 'deleted_task',
      details: `Deleted task "${task.title}"`,
    },
  });

  return { message: 'Task deleted successfully.', projectId: task.projectId };
};

module.exports = {
  createList,
  updateList,
  deleteList,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
};
