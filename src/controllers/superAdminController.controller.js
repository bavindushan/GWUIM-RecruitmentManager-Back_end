const catchAsync = require('../utils/catchAsync');
const { BadRequestError } = require('../utils/AppError');
const superAdminService = require('../services/superAdminService.service');

// Get all audit logs
exports.getAllAuditLogs = catchAsync(async (req, res, next) => {
    const logs = await superAdminService.getAllAuditLogs();

    res.status(200).json({
        status: "success",
        data: logs,
    });
});

// Soft delete admin
exports.softDeleteAdmin = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const deletedAdmin = await superAdminService.softDeleteAdmin(Number(id));

    if (!deletedAdmin) {
        return next(new NotFoundError("Admin not found"));
    }

    res.status(200).json({
        status: "success",
        message: "Admin deleted successfully (soft delete)",
    });
});

// Update Admin Info
exports.updateAdmin = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { fullName, email, department, phoneNumber } = req.body;

    if (!fullName || !email || !department) {
        throw new BadRequestError("FullName, Email and Department are required");
    }

    const updatedAdmin = await superAdminService.updateAdmin(id, { fullName, email, department, phoneNumber });

    res.status(200).json({
        status: 'success',
        message: 'Admin updated successfully',
        data: updatedAdmin
    });
});

// Change Admin Password
exports.changeAdminPassword = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
        throw new BadRequestError("New password is required");
    }

    await superAdminService.changeAdminPassword(id, newPassword);

    res.status(200).json({
        status: 'success',
        message: 'Admin password changed successfully'
    });
});

// Create Admin (SuperAdmin)
exports.createAdmin = catchAsync(async (req, res, next) => {
    const { fullName, email, password, department, phoneNumber } = req.body;

    if (!fullName || !email || !password) {
        throw new BadRequestError("Full name, email, and password are required");
    }

    const admin = await superAdminService.createAdmin({ fullName, email, password, department, phoneNumber });

    // Don't return password hash
    const { PasswordHash, ...safeAdmin } = admin;

    res.status(201).json({
        status: 'success',
        message: 'Admin created successfully',
        data: safeAdmin,
    });
});

// Sign up SuperAdmin
exports.signUpSuperAdmin = catchAsync(async (req, res, next) => {
    const { FullName, Email, Password, PhoneNumber } = req.body;

    if (!FullName || !Email || !Password) {
        throw new BadRequestError("Full name, email, and password are required");
    }

    const result = await superAdminService.signUpSuperAdmin({ FullName, Email, Password, PhoneNumber });

    res.status(201).json({
        status: 'success',
        message: 'SuperAdmin registered successfully',
        data: result,
    });
});

// Sign in SuperAdmin
exports.signInSuperAdmin = catchAsync(async (req, res, next) => {
    const { Email, Password } = req.body;

    if (!Email || !Password) {
        throw new BadRequestError("Email and password are required");
    }

    const result = await superAdminService.signInSuperAdmin({ Email, Password });

    // Remove password hash before sending response
    const { PasswordHash, ...safeSuperAdmin } = result.superAdmin;

    res.status(200).json({
        status: 'success',
        message: 'SuperAdmin signed in successfully',
        token: result.token,
        superAdmin: safeSuperAdmin,
    });
});

