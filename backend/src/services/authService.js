const prisma = require('../config/prisma');
const { hashPassword, comparePassword, generateToken } = require('../utils/authUtils');

/**
 * Register a new user
 */
const register = async ({ name, email, password, avatarUrl }) => {
  if (!name || !email || !password) {
    const error = new Error('Name, email, and password are required.');
    error.statusCode = 400;
    throw error;
  }

  if (password.length < 6) {
    const error = new Error('Password must be at least 6 characters.');
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if email already registered
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    const error = new Error('An account with this email already exists.');
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await hashPassword(password);

  const defaultAvatar = avatarUrl && avatarUrl.trim()
    ? avatarUrl.trim()
    : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`;

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      avatarUrl: defaultAvatar,
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  const token = generateToken(user);

  return { user, token };
};

/**
 * Login user with email and password
 */
const login = async ({ email, password }) => {
  if (!email || !password) {
    const error = new Error('Email and password are required.');
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  const userSafe = {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };

  const token = generateToken(userSafe);

  return { user: userSafe, token };
};

/**
 * Get current user profile with summary counts
 */
const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
      _count: {
        select: {
          ownedProjects: true,
          memberships: true,
          assignedTasks: true,
        },
      },
    },
  });

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    stats: {
      ownedProjects: user._count.ownedProjects,
      totalProjects: user._count.memberships,
      assignedTasks: user._count.assignedTasks,
    },
  };
};

module.exports = {
  register,
  login,
  getMe,
};
