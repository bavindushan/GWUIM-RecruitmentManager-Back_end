const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { BadRequestError, UnauthorizedError, ValidationError, ConflictError } = require('../utils/AppError');
const { isValidEmail, isValidPhoneNumber  } = require('../utils/emailAndPhoneValidations');
const { hashPassword, comparePasswords } = require('../utils/passwordUtils');
const generateToken = require('../utils/generateToken');
const { logAdminAction } = require('./LogMionitoringService.service');

//get all jobs
exports.getAllJobs = async () => {
    const jobs = await prisma.jobvacancy.findMany({
        select: {
            JobID: true,
            Title: true
        },
        orderBy: {
            Title: 'asc'
        }
    });

    if (!jobs || jobs.length === 0) {
        throw new NotFoundError('No jobs found');
    }

    return jobs;
};

// Change applicant password
exports.changeApplicantPassword = async (userId, newPassword) => {
    if (!newPassword) {
        throw new BadRequestError('New password is required');
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    const updatedUser = await prisma.user.update({
        where: { UserID: userId },
        data: { PasswordHash: hashedPassword }
    });

    if (!updatedUser) {
        throw new NotFoundError('Applicant not found');
    }

    return {
        message: 'Applicant password changed successfully',
        UserID: updatedUser.UserID,
    };
};

// Update applicant
exports.updateApplicant = async (userId, updateData) => {
    const { FullName, Email, NIC, PhoneNumber, Address, AccountStatus } = updateData;

    // Validate required fields
    if (!FullName || !Email || !NIC || !PhoneNumber || !Address || !AccountStatus) {
        throw new BadRequestError("All fields are required.");
    }

    // Validate email & phone format
    if (!isValidEmail(Email)) {
        throw new ValidationError("Invalid email format.");
    }
    if (!isValidPhoneNumber(PhoneNumber)) {
        throw new ValidationError("Invalid phone number format.");
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { UserID: userId } });
    if (!existingUser) {
        throw new NotFoundError("Applicant not found.");
    }

    // Check for email or NIC conflicts with other users
    const conflictUser = await prisma.user.findFirst({
        where: {
            OR: [{ Email }, { NIC }],
            NOT: { UserID: userId }
        }
    });
    if (conflictUser) {
        throw new ConflictError("Email or NIC already exists for another user.");
    }

    // Update user
    const updatedUser = await prisma.user.update({
        where: { UserID: userId },
        data: {
            FullName,
            Email,
            NIC,
            PhoneNumber,
            Address,
            AccountStatus,
            UpdatedAt: new Date()
        }
    });

    return updatedUser;
};

// Get all applicants with job details
exports.getAllApplicants = async () => {
    const applicants = await prisma.user.findMany({
        select: {
            UserID: true,
            FullName: true,
            Email: true,
            NIC: true,
            PhoneNumber: true,
            Address: true,
            AccountStatus: true,
            CreatedAt: true,
            UpdatedAt: true,
            application: {
                select: {
                    ApplicationID: true,
                    JobID: true,
                    Status: true,
                    SubmissionDate: true,
                    jobvacancy: {
                        select: {
                            JobID: true,
                            Title: true,  // this is the post applied title
                        }
                    }
                },
                orderBy: {
                    SubmissionDate: 'desc'
                }
            }
        },
        orderBy: {
            CreatedAt: 'desc'
        }
    });

    if (!applicants || applicants.length === 0) {
        throw new NotFoundError('No applicants found');
    }

    return applicants;
};

// Fetch full application details by ApplicationID
exports.getApplicationByID = async (applicationID) => {
    const application = await prisma.application.findUnique({
        where: { ApplicationID: parseInt(applicationID) },
        include: {
            user: true,
            jobvacancy: { include: { applicationtemplate: true } },
            applicationgeneraldetails: true,
            applicationreferences: true,
            employmenthistories: true,
            experiencedetails: true,
            gce_al_results: true,
            gce_ol_results: true,
            languageproficiencies: true,
            professionalqualifications: true,
            researchandpublications: true,
            specialqualifications: true,
            universityeducations: {
                include: {
                    firstdegreesubjects: true,
                },
            },
            additionalinfo: true,
            secondaryeducations: true,
        },
    });

    if (!application) {
        throw new NotFoundError('Application not found');
    }

    return application;
};

// Update application status
exports.updateApplicationStatus = async ({ adminID, applicationID, status, remarks }) => {
    const application = await prisma.application.findUnique({
        where: { ApplicationID: applicationID }
    });

    if (!application) {
        throw new NotFoundError('Application not found');
    }

    // Validate status enum
    const allowedStatuses = ['New', 'In Reviewing', 'Call for Interview', 'Hired'];
    if (!allowedStatuses.includes(status)) {
        throw new ValidationError('Invalid application status');
    }

    const updatedApplication = await prisma.application.update({
        where: { ApplicationID: applicationID },
        data: {
            Status: status,
            Remarks: remarks || undefined
        }
    });

    await logAdminAction(
        adminID,
        'Admin',
        'Update Application Status',
        `Admin ID: ${adminID} updated status of Application ID: ${applicationID} to "${status}"`
    );

    return updatedApplication;
};

// Delete job vacancy by ID
exports.deleteJobVacancy = async ({ adminID, jobID }) => {
    // Check if job exists
    const job = await prisma.jobvacancy.findUnique({
        where: { JobID: jobID },
    });

    if (!job) {
        throw new NotFoundError('Job vacancy not found');
    }

    const deletedJob = await prisma.jobvacancy.delete({
        where: { JobID: jobID },
    });

    // Log admin action
    await logAdminAction(
        adminID,
        'Admin',
        'Delete Job Vacancy',
        `Admin ID: ${adminID} deleted Job Vacancy ID: ${jobID}`
    );

    return deletedJob;
};

// Update vacancy expiry date
exports.updateJobVacancyExpiryDate = async ({ adminID, jobID, newExpiryDate }) => {
    // Check if job exists
    const job = await prisma.jobvacancy.findUnique({ where: { JobID: jobID } });
    if (!job) {
        throw new NotFoundError('Job vacancy not found');
    }

    const today = new Date();
    const newDate = new Date(newExpiryDate);

    if (newDate <= today) {
        throw new ValidationError('Expiry date must be a future date');
    }

    const updatedJob = await prisma.jobvacancy.update({
        where: { JobID: jobID },
        data: {
            ExpiryDate: newDate,
            Status: 'Open',
        },
    });

    // Log action to audit
    await logAdminAction(
        adminID,
        'Admin',
        'Update Expiry Date',
        `Admin ID: ${adminID} updated expiry date and reopened Job Vacancy ID: ${jobID}`
    );

    return updatedJob;
};

// Post job vacancy
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