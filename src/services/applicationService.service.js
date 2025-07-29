const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { BadRequestError, ValidationError, } = require('../utils/AppError');

exports.submitGeneralDetails = async (userId, jobId, generalDetails) => {
    // 1. Validate required data
    if (!userId || !jobId) {
        throw new BadRequestError('User ID and Job ID are required.');
    }

    // 2. Check if there's already an application for this user and job
    let application = await prisma.application.findFirst({
        where: {
            UserID: userId,
            JobID: jobId,
        },
    });

    // 3. If not, create a new application record
    if (!application) {
        application = await prisma.application.create({
            data: {
                UserID: userId,
                JobID: jobId,
                SubmissionDate: new Date(),
                Status: 'New',
                Remarks: '',
                UpdatedAt: new Date(),
            },
        });
    }

    // 4. Check if general details already exist
    const existingDetails = await prisma.applicationgeneraldetails.findUnique({
        where: { ApplicationID: application.ApplicationID },
    });

    if (existingDetails) {
        throw new ValidationError('General details already submitted for this application.');
    }

    // 5. Save general details
    const savedDetails = await prisma.applicationgeneraldetails.create({
        data: {
            ApplicationID: application.ApplicationID,
            ...generalDetails,
        },
    });

    return savedDetails;
};