const userService = require('../services/userService.service');
const generateToken = require('../utils/generateToken');
const { UnauthorizedError } = require('../utils/AppError');

exports.getAllUsers = async (req, res) => {
  const users = await userService.getAllUsers();
  res.json(users);
};

exports.signIn = async (req, res, next) => {
  const { email, password } = req.body;
  const user = await userService.findUserByEmail(email);

  if (!user || user.password !== password) {
    // Note: you should hash passwords in real apps!
    return next(new UnauthorizedError('Invalid email or password'));
  }

  const token = generateToken({ id: user.id, email: user.email });
  res.json({ token, user });
};
