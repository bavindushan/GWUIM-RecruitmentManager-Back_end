const catchAsync = require('../utils/catchAsync');
const { BadRequestError } = require('../utils/AppError');
const superAdminService = require('../services/superAdminService.service');

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

