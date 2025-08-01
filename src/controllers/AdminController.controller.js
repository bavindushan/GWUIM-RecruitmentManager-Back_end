const catchAsync = require('../utils/catchAsync');
const { BadRequestError } = require('../utils/AppError');
const adminService = require('../services/AdminSrvice.service');

// Post job vacancy
exports.postJobVacancy = catchAsync(async (req, res, next) => {
    const {
        title,
        description,
        type,
        department,
        level,
        expiryDate,
        status,
        templateID,
    } = req.body;

    const adminID = req.user?.id;

    if (!adminID) {
        return next(new BadRequestError('Unauthorized access. Admin ID missing.'));
    }

    const job = await adminService.postJobVacancy({
        title,
        description,
        type,
        department,
        level,
        expiryDate,
        status,
        templateID,
        adminID,
    });

    res.status(201).json({
        status: 'success',
        message: 'Job vacancy posted successfully',
        job,
    });
});


// Sign in admin
exports.loginAdmin = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(new BadRequestError('Email and password are required'));
    }

    const result = await adminService.signInAdmin(email, password);

    res.status(200).json({
        status: 'success',
        message: result.message,
        token: result.token,
        admin: result.admin,
    });
});

// Sign up admin
exports.signUpAdmin = catchAsync(async (req, res, next) => {
    const { fullName, email, password, department, phoneNumber } = req.body;

    if (!fullName || !email || !password) {
        return next(new BadRequestError('Full name, email, and password are required'));
    }

    const admin = await adminService.signUpAdmin({ fullName, email, password, department, phoneNumber });

    res.status(201).json({
        status: 'success',
        message: 'Admin registered successfully',
        data: admin,
    });
});