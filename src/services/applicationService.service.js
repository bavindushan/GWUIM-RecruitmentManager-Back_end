const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { BadRequestError, ValidationError, NotFoundError } = require('../utils/AppError');

// Save GCE A/L results for an application
exports.submitGceAlResults = async (userId, jobId, alResults) => {
    if (!Array.isArray(alResults) || alResults.length === 0) {
        throw new BadRequestError('A/L results must be provided as a non-empty array.');
    }

    // 1. Fetch the existing application
    const application = await prisma.application.findFirst({
        where: {
            UserID: userId,
            JobID: jobId,
        },
    });

    if (!application) {
        throw new NotFoundError('No application found for the given user and job.');
    }

    // 2. Prepare A/L result records
    const recordsToInsert = alResults.map(result => ({
        ApplicationID: application.ApplicationID,
        Subject: result.Subject,
        Grade: result.Grade,
    }));

    // 3. Save A/L results
    const created = await prisma.gce_al_results.createMany({
        data: recordsToInsert,
    });

    return { message: `${created.count} A/L results submitted successfully.` };
};


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
                SubmissionDate: new Date(),
                Status: "New",
                Remarks: "",
                user: {
                    connect: { UserID: userId }
                },
                jobvacancy: {
                    connect: { JobID: jobId }
                }
            }
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