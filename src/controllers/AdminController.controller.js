const catchAsync = require('../utils/catchAsync');
const { BadRequestError } = require('../utils/AppError');
const adminService = require('../services/AdminSrvice.service');

// Update application status
exports.updateApplicationStatus = catchAsync(async (req, res, next) => {
    const { applicationID } = req.params;
    const { status, remarks } = req.body;

    const adminID = req.user?.id;

    if (!status) {
        return next(new ValidationError('Application status is required'));
    }

    const updatedApplication = await adminService.updateApplicationStatus({
        adminID,
        applicationID: parseInt(applicationID),
        status,
        remarks
    });

    res.status(200).json({
        status: 'success',
        message: 'Application status updated successfully',
        application: updatedApplication
    });
});

// Delete job vacancy by ID 
exports.deleteJobVacancy = catchAsync(async (req, res, next) => {
    const { jobID } = req.params;
    const adminID = req.user?.id;

    if (!jobID) {
        return next(new ValidationError('Job ID is required'));
    }

    const deletedJob = await adminService.deleteJobVacancy({
        adminID,
        jobID: parseInt(jobID),
    });

    res.status(200).json({
        status: 'success',
        message: 'Job vacancy deleted successfully',
        job: deletedJob,
    });
});

// Update job vacancy expiry date
exports.updateExpiryDate = catchAsync(async (req, res, next) => {
    const { jobID } = req.params;
    const { newExpiryDate } = req.body;

    const adminID = req.user?.id;

    if (!newExpiryDate) {
        return next(new ValidationError('New expiry date is required'));
    }

    const updatedJob = await adminService.updateJobVacancyExpiryDate({
        adminID,
        jobID: parseInt(jobID),
        newExpiryDate,
    });

    res.status(200).json({
        status: 'success',
        message: 'Expiry date updated successfully',
        job: updatedJob,
    });
});

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