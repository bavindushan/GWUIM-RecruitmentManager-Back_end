const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { hashPassword, comparePasswords } = require('../utils/passwordUtils');
const generateToken = require('../utils/generateToken');
const { BadRequestError, UnauthorizedError } = require('../utils/AppError');

// Get all audit logs
exports.getAllAuditLogs = async () => {
    return prisma.auditlog.findMany({
        orderBy: { Timestamp: 'desc' },
    });
};

// Soft delete admin (set isDeleted = true)
exports.softDeleteAdmin = async (adminId) => {
    const admin = await prisma.admin.findUnique({
        where: { AdminID: adminId },
    });

    if (!admin || admin.isDeleted) {
        return null; // Already deleted or not found
    }

    return prisma.admin.update({
        where: { AdminID: adminId },
        data: { isDeleted: true },
    });
};

// Update admin info
exports.updateAdmin = async (id, { fullName, email, department, phoneNumber }) => {
    const admin = await prisma.admin.findUnique({ where: { AdminID: parseInt(id) } });
    if (!admin) throw new NotFoundError("Admin not found");

    const updatedAdmin = await prisma.admin.update({
        where: { AdminID: parseInt(id) },
        data: { FullName: fullName, Email: email, Department: department, PhoneNumber: phoneNumber }
    });

    // Remove password before returning
    const { PasswordHash, ...safeAdmin } = updatedAdmin;
    return safeAdmin;
};

// Change admin password
exports.changeAdminPassword = async (id, newPassword) => {
    const admin = await prisma.admin.findUnique({ where: { AdminID: parseInt(id) } });
    if (!admin) throw new NotFoundError("Admin not found");

    const PasswordHash = await hashPassword(newPassword);

    await prisma.admin.update({
        where: { AdminID: parseInt(id) },
        data: { PasswordHash }
    });

    return true;
};

// Create Admin (by SuperAdmin)
exports.createAdmin = async ({ fullName, email, password, department, phoneNumber }) => {
    // Check if email already exists
    const existing = await prisma.admin.findUnique({ where: { Email: email } });
    if (existing) throw new BadRequestError("Admin email already exists");

    // Hash password
    const PasswordHash = await hashPassword(password);

    // Create admin
    const newAdmin = await prisma.admin.create({
        data: {
            FullName: fullName,
            Email: email,
            PasswordHash,
            Department: department || null,
            PhoneNumber: phoneNumber || null,
        },
    });

    return newAdmin;
};

// Sign up SuperAdmin
exports.signUpSuperAdmin = async ({ FullName, Email, Password, PhoneNumber }) => {
    const existing = await prisma.superadmin.findUnique({ where: { Email } });
    if (existing) throw new BadRequestError("Email already exists");

    const PasswordHash = await hashPassword(Password);

    const newAdmin = await prisma.superadmin.create({
        data: { FullName, Email, PasswordHash, PhoneNumber },
    });

    return newAdmin;
};

// Sign in SuperAdmin
exports.signInSuperAdmin = async ({ Email, Password }) => {
    const admin = await prisma.superadmin.findUnique({ where: { Email } });
    if (!admin) throw new UnauthorizedError("Invalid email or password");

    const isMatch = await comparePasswords(Password, admin.PasswordHash);
    if (!isMatch) throw new UnauthorizedError("Invalid email or password");

    const token = generateToken({ id: admin.SuperAdminID });
    return { superAdmin: admin, token };
};
