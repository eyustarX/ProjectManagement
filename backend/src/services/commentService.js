const prisma = require('../config/prisma');
const { getProjectMembership } = require('./projectService');

/**
 * Add a comment to a task
 */
const addComment = async (taskId, userId, content) => {
  if (!content || !content.trim()) {
    const error = new Error('Comment content cannot be empty.');
    error.statusCode = 400;
    throw error;
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
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

  const comment = await prisma.comment.create({
    data: {
      taskId,
      authorId: userId,
      content: content.trim(),
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      projectId: task.projectId,
      taskId: task.id,
      userId,
      action: 'added_comment',
      details: `Commented on "${task.title}"`,
    },
  });

  return {
    comment,
    projectId: task.projectId,
    taskTitle: task.title,
    assigneeId: task.assigneeId,
  };
};

/**
 * Get comments for a task
 */
const getTaskComments = async (taskId, userId) => {
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

  const comments = await prisma.comment.findMany({
    where: { taskId },
    orderBy: { createdAt: 'asc' },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });

  return comments;
};

/**
 * Delete a comment (Author or Project Admin/Owner)
 */
const deleteComment = async (commentId, userId) => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      task: true,
    },
  });

  if (!comment) {
    const error = new Error('Comment not found.');
    error.statusCode = 404;
    throw error;
  }

  const membership = await getProjectMembership(comment.task.projectId, userId);
  if (!membership) {
    const error = new Error('Access denied.');
    error.statusCode = 403;
    throw error;
  }

  const isAuthor = comment.authorId === userId;
  const isPrivileged = membership.role === 'OWNER' || membership.role === 'ADMIN';

  if (!isAuthor && !isPrivileged) {
    const error = new Error('Permission denied: You can only delete your own comments.');
    error.statusCode = 403;
    throw error;
  }

  await prisma.comment.delete({
    where: { id: commentId },
  });

  return {
    message: 'Comment deleted successfully.',
    taskId: comment.taskId,
    projectId: comment.task.projectId,
  };
};

/**
 * Get project activities stream
 */
const getProjectActivities = async (projectId, userId) => {
  const membership = await getProjectMembership(projectId, userId);
  if (!membership) {
    const error = new Error('Access denied.');
    error.statusCode = 403;
    throw error;
  }

  const activities = await prisma.activityLog.findMany({
    where: { projectId },
    take: 30,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });

  return activities;
};

module.exports = {
  addComment,
  getTaskComments,
  deleteComment,
  getProjectActivities,
};
