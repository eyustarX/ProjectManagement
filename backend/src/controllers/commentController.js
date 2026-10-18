const commentService = require('../services/commentService');
const { emitProjectEvent, emitUserEvent } = require('../sockets/socketHandler');

const addComment = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;

    const result = await commentService.addComment(taskId, req.user.id, content);

    const io = req.app.get('io');
    emitProjectEvent(io, result.projectId, 'comment:created', {
      comment: result.comment,
      taskId,
    });

    // Notify task assignee if someone else commented on their task
    if (result.assigneeId && result.assigneeId !== req.user.id) {
      emitUserEvent(io, result.assigneeId, 'notification:received', {
        type: 'COMMENT_ADDED',
        message: `${req.user.name} commented on "${result.taskTitle}"`,
        taskId,
        projectId: result.projectId,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Comment added successfully.',
      data: result.comment,
    });
  } catch (error) {
    next(error);
  }
};

const getComments = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const comments = await commentService.getTaskComments(taskId, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Comments retrieved successfully.',
      data: comments,
    });
  } catch (error) {
    next(error);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await commentService.deleteComment(id, req.user.id);

    const io = req.app.get('io');
    emitProjectEvent(io, result.projectId, 'comment:deleted', {
      commentId: id,
      taskId: result.taskId,
    });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

const getActivities = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const activities = await commentService.getProjectActivities(projectId, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Project activities retrieved successfully.',
      data: activities,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addComment,
  getComments,
  deleteComment,
  getActivities,
};
