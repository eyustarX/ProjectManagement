const prisma = require('../config/prisma');

/**
 * Check if a user is a member of a project and return their role
 */
const getProjectMembership = async (projectId, userId) => {
  return prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
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
};

/**
 * Create a new project with default Kanban lists and owner membership
 */
const createProject = async (ownerId, { name, description }) => {
  if (!name || !name.trim()) {
    const error = new Error('Project name is required.');
    error.statusCode = 400;
    throw error;
  }

  // Transaction: Create project, owner member, default Kanban lists, and initial activity log
  const project = await prisma.$transaction(async (tx) => {
    // 1. Create project
    const newProject = await tx.project.create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : '',
        ownerId,
      },
    });

    // 2. Add owner as project member with OWNER role
    await tx.projectMember.create({
      data: {
        projectId: newProject.id,
        userId: ownerId,
        role: 'OWNER',
      },
    });

    // 3. Create standard Kanban columns / task lists
    const defaultLists = [
      { name: 'To Do', position: 0 },
      { name: 'In Progress', position: 1 },
      { name: 'In Review', position: 2 },
      { name: 'Done', position: 3 },
    ];

    for (const list of defaultLists) {
      await tx.taskList.create({
        data: {
          projectId: newProject.id,
          name: list.name,
          position: list.position,
        },
      });
    }

    // 4. Log initial activity
    await tx.activityLog.create({
      data: {
        projectId: newProject.id,
        userId: ownerId,
        action: 'created_project',
        details: `Created project "${newProject.name}"`,
      },
    });

    return newProject;
  });

  return getProjectById(project.id, ownerId);
};

/**
 * Get all projects where the user is an owner or member
 */
const getUserProjects = async (userId) => {
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    include: {
      project: {
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          members: {
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
          },
          _count: {
            select: {
              tasks: true,
              members: true,
            },
          },
        },
      },
    },
    orderBy: {
      project: {
        updatedAt: 'desc',
      },
    },
  });

  return memberships.map((m) => ({
    ...m.project,
    myRole: m.role,
    joinedAt: m.joinedAt,
    tasksCount: m.project._count.tasks,
    membersCount: m.project._count.members,
  }));
};

/**
 * Get single project with lists, task cards, members, and recent activity
 */
const getProjectById = async (projectId, userId) => {
  const membership = await getProjectMembership(projectId, userId);
  if (!membership) {
    const error = new Error('Access denied: You are not a member of this project.');
    error.statusCode = 403;
    throw error;
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
      members: {
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
        orderBy: { joinedAt: 'asc' },
      },
      lists: {
        orderBy: { position: 'asc' },
        include: {
          tasks: {
            orderBy: { position: 'asc' },
            include: {
              creator: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                },
              },
              assignee: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                },
              },
              _count: {
                select: {
                  comments: true,
                },
              },
            },
          },
        },
      },
      activities: {
        take: 20,
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
      },
    },
  });

  if (!project) {
    const error = new Error('Project not found.');
    error.statusCode = 404;
    throw error;
  }

  return {
    ...project,
    myRole: membership.role,
  };
};

/**
 * Update project information (name, description)
 */
const updateProject = async (projectId, userId, { name, description }) => {
  const membership = await getProjectMembership(projectId, userId);
  if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
    const error = new Error('Permission denied: Only project owners or admins can update project details.');
    error.statusCode = 403;
    throw error;
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description: description.trim() }),
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId,
      userId,
      action: 'updated_project',
      details: `Updated project details`,
    },
  });

  return updated;
};

/**
 * Delete a project (Owner only)
 */
const deleteProject = async (projectId, userId) => {
  const membership = await getProjectMembership(projectId, userId);
  if (!membership || membership.role !== 'OWNER') {
    const error = new Error('Permission denied: Only the project owner can delete the project.');
    error.statusCode = 403;
    throw error;
  }

  await prisma.project.delete({
    where: { id: projectId },
  });

  return { message: 'Project deleted successfully.' };
};

/**
 * Add / invite a member to the project
 */
const addProjectMember = async (projectId, currentUserId, { emailOrUserId, role = 'MEMBER' }) => {
  const currentMembership = await getProjectMembership(projectId, currentUserId);
  if (!currentMembership || (currentMembership.role !== 'OWNER' && currentMembership.role !== 'ADMIN')) {
    const error = new Error('Permission denied: Only owners and admins can invite members.');
    error.statusCode = 403;
    throw error;
  }

  if (!emailOrUserId || !emailOrUserId.trim()) {
    const error = new Error('User email or ID is required.');
    error.statusCode = 400;
    throw error;
  }

  const query = emailOrUserId.trim().toLowerCase();

  // Find user by ID or email
  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [
        { id: query },
        { email: query },
      ],
    },
  });

  if (!targetUser) {
    const error = new Error('No registered user found with that email or ID.');
    error.statusCode = 404;
    throw error;
  }

  // Check if already a member
  const existingMember = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: targetUser.id,
      },
    },
  });

  if (existingMember) {
    const error = new Error('User is already a member of this project.');
    error.statusCode = 409;
    throw error;
  }

  const validRole = ['ADMIN', 'MEMBER'].includes(role) ? role : 'MEMBER';

  const newMember = await prisma.projectMember.create({
    data: {
      projectId,
      userId: targetUser.id,
      role: validRole,
    },
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

  await prisma.activityLog.create({
    data: {
      projectId,
      userId: currentUserId,
      action: 'added_member',
      details: `Added ${targetUser.name} to the project as ${validRole}`,
    },
  });

  return newMember;
};

/**
 * Remove a member from the project
 */
const removeProjectMember = async (projectId, currentUserId, targetMemberId) => {
  const currentMembership = await getProjectMembership(projectId, currentUserId);
  if (!currentMembership) {
    const error = new Error('Access denied.');
    error.statusCode = 403;
    throw error;
  }

  const targetMember = await prisma.projectMember.findUnique({
    where: { id: targetMemberId },
    include: { user: true },
  });

  if (!targetMember || targetMember.projectId !== projectId) {
    const error = new Error('Project member not found.');
    error.statusCode = 404;
    throw error;
  }

  // Cannot remove the owner
  if (targetMember.role === 'OWNER') {
    const error = new Error('Cannot remove the project owner.');
    error.statusCode = 400;
    throw error;
  }

  // Allow: Owner or Admin removing a Member, OR user removing themselves (leaving)
  const isSelf = targetMember.userId === currentUserId;
  const isAuthorized = currentMembership.role === 'OWNER' || currentMembership.role === 'ADMIN';

  if (!isSelf && !isAuthorized) {
    const error = new Error('Permission denied: You cannot remove this member.');
    error.statusCode = 403;
    throw error;
  }

  // Remove membership and unassign tasks in this project
  await prisma.$transaction([
    prisma.projectMember.delete({
      where: { id: targetMemberId },
    }),
    prisma.task.updateMany({
      where: {
        projectId,
        assigneeId: targetMember.userId,
      },
      data: {
        assigneeId: null,
      },
    }),
    prisma.activityLog.create({
      data: {
        projectId,
        userId: currentUserId,
        action: 'removed_member',
        details: isSelf
          ? `${targetMember.user.name} left the project`
          : `Removed ${targetMember.user.name} from the project`,
      },
    }),
  ]);

  return { message: 'Member removed successfully.' };
};

/**
 * Update member role (Owner only)
 */
const updateMemberRole = async (projectId, currentUserId, targetMemberId, newRole) => {
  const currentMembership = await getProjectMembership(projectId, currentUserId);
  if (!currentMembership || currentMembership.role !== 'OWNER') {
    const error = new Error('Permission denied: Only the project owner can change member roles.');
    error.statusCode = 403;
    throw error;
  }

  if (!['ADMIN', 'MEMBER'].includes(newRole)) {
    const error = new Error('Invalid role. Allowed roles: ADMIN, MEMBER.');
    error.statusCode = 400;
    throw error;
  }

  const targetMember = await prisma.projectMember.findUnique({
    where: { id: targetMemberId },
  });

  if (!targetMember || targetMember.projectId !== projectId) {
    const error = new Error('Member not found.');
    error.statusCode = 404;
    throw error;
  }

  if (targetMember.role === 'OWNER') {
    const error = new Error('Cannot change the role of the project owner.');
    error.statusCode = 400;
    throw error;
  }

  const updated = await prisma.projectMember.update({
    where: { id: targetMemberId },
    data: { role: newRole },
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

  return updated;
};

module.exports = {
  createProject,
  getUserProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  updateMemberRole,
  getProjectMembership,
};
