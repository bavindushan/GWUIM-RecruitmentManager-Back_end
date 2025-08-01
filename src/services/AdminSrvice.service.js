const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { BadRequestError, UnauthorizedError, ValidationError } = require('../utils/AppError');
const { isValidEmail } = require('../utils/emailAndPhoneValidations');
const { hashPassword, comparePasswords } = require('../utils/passwordUtils');
const generateToken = require('../utils/generateToken');
const { logAdminAction } = require('./LogMionitoringService.service');


exports.postJobVacancy = async ({
    title,
    description,
    type,
    department,
    level,
    expiryDate,
    status,
    templateID,
    adminID,
}) => {
    // Validate required fields
    if (!title || !description || !type || !department || !level || !expiryDate || !status) {
        throw new BadRequestError('Missing required fields for job vacancy creation');
    }

    // Validate expiryDate > today
    const today = new Date();
    const expiry = new Date(expiryDate);
    if (expiry <= today) {
        throw new BadRequestError('Expiry date must be a future date');
    }

    // // Validate enum values
    // if (!Object.values(jobvacancy_Type).includes(type)) {
    //     throw new BadRequestError(`Invalid job type: ${type}`);
    // }

    // if (!Object.values(jobvacancy_Status).includes(status)) {
    //     throw new BadRequestError(`Invalid job status: ${status}`);
    // }

    // Create job vacancy
    const job = await prisma.jobvacancy.create({
        data: {
            Title: title,
            Description: description,
            Type: type,
            Department: department,
            Level: level,
            PostedBy: adminID,
            PostedDate: new Date(),
            ExpiryDate: expiry,
            Status: status,
            TemplateID: templateID,
        },
    });

    // Log action to audit
    await logAdminAction(
        adminID,
        'Admin',
        'Add a New Job Vacancy',
        `Admin ID: ${adminID} added a new job vacancy successfully`
    );

    return job;
};

exports.signInAdmin = async (email, password) => {
    if (!email || !password) {
        throw new BadRequestError('Email and password are required');
    }

    if (!isValidEmail(email)) {
        throw new ValidationError('Invalid email format');
    }

    const admin = await prisma.admin.findUnique({ where: { Email: email } });

    if (!admin || admin.isDeleted) {
        throw new UnauthorizedError('Invalid credentials or account is not active');
    }

    const isMatch = await comparePasswords(password, admin.PasswordHash);
    if (!isMatch) {
        throw new UnauthorizedError('Invalid email or password');
    }

    // Generate JWT token payload
    const payload = {
        id: admin.AdminID,
        email: admin.Email,
        role: 'admin',
    };

    const token = generateToken(payload);

    // Log admin login action
    await logAdminAction(
        admin.AdminID,
        'Admin',
        'Admin Login',
        `Admin ID: ${admin.AdminID} logged in successfully`
    );

    return {
        message: 'Login successful',
        token,
        admin: {
            id: admin.AdminID,
            fullName: admin.FullName,
            email: admin.Email,
            department: admin.Department,
            phoneNumber: admin.PhoneNumber,
        },
    };
};

exports.signUpAdmin = async ({ fullName, email, password, department, phoneNumber }) => {
    if (!fullName || !email || !password) {
        throw new BadRequestError('Full name, email, and password are required');
    }

    if (!isValidEmail(email)) {
        throw new ValidationError('Invalid email format');
    }

    const existingAdmin = await prisma.admin.findUnique({
        where: { Email: email },
    });

    if (existingAdmin) {
        throw new BadRequestError('Email is already registered');
    }

    const passwordHash = await hashPassword(password);

    const newAdmin = await prisma.admin.create({
        data: {
            FullName: fullName,
            Email: email,
            PasswordHash: passwordHash,
            Department: department || null,
            PhoneNumber: phoneNumber || null,
        },
    });

    return {
        id: newAdmin.AdminID,
        fullName: newAdmin.FullName,
        email: newAdmin.Email,
        department: newAdmin.Department,
        phoneNumber: newAdmin.PhoneNumber,
    };
};