const userService = require('../services/userService.service');
const catchAsync = require('../utils/catchAsync');
const { AppError, BadRequestError } = require('../utils/AppError');

// Register user
exports.registerUser = catchAsync(async (req, res, next) => {
  const userData = req.body;

  const user = await userService.registerUser(userData);

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    data: {
      user,
    },
  });
});

// Sign in user
exports.loginUser = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new BadRequestError('Email and password are required')); 
  }

  const token = await userService.signInUser(email, password);

  res.status(200).json({
    status: 'success',
    message: 'Login successful',
    token,
  });
});
