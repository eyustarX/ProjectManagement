const projectService = require('../services/projectService');
const { emitProjectEvent, emitUserEvent } = require('../sockets/socketHandler');

const createProject = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const project = await projectService.createProject(req.user.id, { name, description });

    res.status(201).json({
      success: true,
      message: 'Project created successfully with default Kanban lists.',
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

const getUserProjects = async (req, res, next) => {
  try {
    const projects = await projectService.getUserProjects(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Projects retrieved successfully.',
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

const getProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await projectService.getProjectById(id, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Project details retrieved successfully.',
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const updated = await projectService.updateProject(id, req.user.id, { name, description });

    const io = req.app.get('io');
    emitProjectEvent(io, id, 'project:updated', updated);

    res.status(200).json({
      success: true,
      message: 'Project updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await projectService.deleteProject(id, req.user.id);

    const io = req.app.get('io');
    emitProjectEvent(io, id, 'project:deleted', { projectId: id });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

const addMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { emailOrUserId, role } = req.body;
    const newMember = await projectService.addProjectMember(id, req.user.id, {
      emailOrUserId,
      role,
    });

    const io = req.app.get('io');
    emitProjectEvent(io, id, 'member:added', newMember);
    emitUserEvent(io, newMember.user.id, 'notification:received', {
      type: 'PROJECT_INVITE',
      message: `You were added to a project`,
      projectId: id,
    });

    res.status(201).json({
      success: true,
      message: 'Member added to project successfully.',
      data: newMember,
    });
  } catch (error) {
    next(error);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const { id, memberId } = req.params;
    const result = await projectService.removeProjectMember(id, req.user.id, memberId);

    const io = req.app.get('io');
    emitProjectEvent(io, id, 'member:removed', { memberId });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

const updateMemberRole = async (req, res, next) => {
  try {
    const { id, memberId } = req.params;
    const { role } = req.body;
    const updated = await projectService.updateMemberRole(id, req.user.id, memberId, role);

    const io = req.app.get('io');
    emitProjectEvent(io, id, 'member:role_updated', updated);

    res.status(200).json({
      success: true,
      message: 'Member role updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProject,
  getUserProjects,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  updateMemberRole,
};
