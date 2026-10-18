const prisma = require('../config/prisma');

/**
 * Search users by name or email for inviting to projects or assigning tasks
 */
const searchUsers = async ({ query = '', currentUserId }) => {
  const searchTerm = query.trim().toLowerCase();

  const users = await prisma.user.findMany({
    where: {
      AND: [
        currentUserId ? { id: { not: currentUserId } } : {},
        searchTerm
          ? {
              OR: [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { email: { contains: searchTerm, mode: 'insensitive' } },
              ],
            }
          : {},
      ],
    },
    take: 15,
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
    orderBy: { name: 'asc' },
  });

  return users;
};

module.exports = {
  searchUsers,
};
