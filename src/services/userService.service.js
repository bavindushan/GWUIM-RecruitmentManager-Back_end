const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { hashPassword, comparePasswords } = require('../utils/passwordUtils');
const generateToken = require('../utils/generateToken');
const { isValidEmail, isValidPhoneNumber } = require('../utils/emailAndPhoneValidations');
const {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ValidationError,
} = require('../utils/AppError');

class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}

const registerUser = async (userData) => {
  const { FullName, Email, Password, NIC, PhoneNumber, Address } = userData;

  // Validate required fields
  if (!FullName || !Email || !Password || !NIC || !PhoneNumber || !Address) {
    throw new BadRequestError('All fields are required');
  }

  // Validate email format
  if (!isValidEmail(Email)) {
    throw new ValidationError('Invalid email format');
  }

  // Validate phone number format
  if (!isValidPhoneNumber(PhoneNumber)) {
    throw new ValidationError('Invalid phone number format');
  }

  // Check for existing email or NIC
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { Email },
        { NIC },
      ],
    },
  });

  if (existingUser) {
    throw new ConflictError('Email or NIC already exists');
  }

  // Hash the password
  const hashedPassword = await hashPassword(Password);

  // Create user
  const newUser = await prisma.user.create({
    data: {
      FullName,
      Email,
      PasswordHash: hashedPassword,
      NIC,
      PhoneNumber,
      Address,
      AccountStatus: 'Active',
    },
  });

  return {
    message: 'User registered successfully',
    user: {
      id: newUser.UserID,
      FullName: newUser.FullName,
      Email: newUser.Email,
      NIC: newUser.NIC,
      PhoneNumber: newUser.PhoneNumber,
      Address: newUser.Address,
      AccountStatus: newUser.AccountStatus,
    },
  };
};

const signInUser = async (email, password) => {
  // Validate input
  if (!email || !password) {
    throw new BadRequestError('Email and password are required');
  }

  if (!isValidEmail(email)) {
    throw new ValidationError('Invalid email format');
  }

  // Fetch user by email
  const user = await prisma.user.findUnique({ where: { Email: email } });

  if (!user || user.AccountStatus !== 'Active') {
    throw new UnauthorizedError('Invalid credentials or account is not active');
  }

  // Check password
  const isMatch = await comparePasswords(password, user.PasswordHash);
  if (!isMatch) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Generate token payload 
  const payload = {
    id: user.UserID,
    email: user.Email,
    role: 'user',
  };

  const token = generateToken(payload);

  return {
    message: 'Login successful',
    token,
    user: {
      id: user.UserID,
      FullName: user.FullName,
      Email: user.Email,
      NIC: user.NIC,
      PhoneNumber: user.PhoneNumber,
      Address: user.Address,
      AccountStatus: user.AccountStatus,
    },
  };
};

module.exports = {
  registerUser,
  signInUser,
};
