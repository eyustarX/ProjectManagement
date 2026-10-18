const authService = require('../services/authService');

const register = async (req, res, next) => {
  try {
    const { name, email, password, avatarUrl } = req.body;
    const result = await authService.register({ name, email, password, avatarUrl });

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const profile = await authService.getMe(req.user.id);

    res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully.',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
};
