const userService = require('../services/userService');

const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    const users = await userService.searchUsers({
      query: q || '',
      currentUserId: req.user ? req.user.id : null,
    });

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully.',
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchUsers,
};
