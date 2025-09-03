const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { hashPassword, comparePasswords } = require('../utils/passwordUtils');
const generateToken = require('../utils/generateToken');
const { BadRequestError, UnauthorizedError } = require('../utils/AppError');

exports.signUpSuperAdmin = async ({ FullName, Email, Password, PhoneNumber }) => {
    const existing = await prisma.superadmin.findUnique({ where: { Email } });
    if (existing) throw new BadRequestError("Email already exists");

    const PasswordHash = await hashPassword(Password);

    const newAdmin = await prisma.superadmin.create({
        data: { FullName, Email, PasswordHash, PhoneNumber },
    });

    return newAdmin;
};

exports.signInSuperAdmin = async ({ Email, Password }) => {
    const admin = await prisma.superadmin.findUnique({ where: { Email } });
    if (!admin) throw new UnauthorizedError("Invalid email or password");

    const isMatch = await comparePasswords(Password, admin.PasswordHash);
    if (!isMatch) throw new UnauthorizedError("Invalid email or password");

    const token = generateToken({ id: admin.SuperAdminID });
    return { superAdmin: admin, token };
};
