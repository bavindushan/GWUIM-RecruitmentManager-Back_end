const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { BadRequestError, ValidationError, NotFoundError } = require('../utils/AppError');

// Submit Language Proficiencies
exports.submitLanguageProficiencies = async (userId, jobId, languageProficiencies) => {
    if (!Array.isArray(languageProficiencies) || languageProficiencies.length === 0) {
        throw new BadRequestError('Language proficiencies must be provided as a non-empty array.');
    }

    // Fetch existing application for user and job
    const application = await prisma.application.findFirst({
        where: {
            UserID: userId,
            JobID: jobId,
        },
    });

    if (!application) {
        throw new NotFoundError('No application found for the given user and job.');
    }

    // Map the input to DB records
    const recordsToInsert = languageProficiencies.map(lp => ({
        ApplicationID: application.ApplicationID,
        Language: lp.Language,
        CanSpeak: lp.CanSpeak,
        CanRead: lp.CanRead,
        CanWrite: lp.CanWrite,
        CanTeach: lp.CanTeach,
    }));

    // Bulk insert language proficiencies
    const createdRecords = await prisma.languageproficiencies.createMany({
        data: recordsToInsert,
    });

    return createdRecords;
};

// Submit Experience Details
exports.submitExperienceDetails = async (userId, jobId, experienceDetails) => {
    if (!Array.isArray(experienceDetails) || experienceDetails.length === 0) {
        throw new BadRequestError('Experience details must be provided as a non-empty array.');
    }

    // 1. Find existing application by userId and jobId
    const application = await prisma.application.findFirst({
        where: {
            UserID: userId,
            JobID: jobId,
        },
    });

    if (!application) {
        throw new NotFoundError('No application found for the given user and job.');
    }

    // 2. Prepare experience details records
    const recordsToInsert = experienceDetails.map(detail => ({
        ApplicationID: application.ApplicationID,
        Description: detail.Description,
    }));

    // 3. Save experience details
    const createdExperienceDetails = await prisma.experiencedetails.createMany({
        data: recordsToInsert,
    });

    return createdExperienceDetails;
};

// Submit Employment Histories
exports.submitEmploymentHistories = async (userId, jobId, employmentHistories) => {
    if (!Array.isArray(employmentHistories) || employmentHistories.length === 0) {
        throw new BadRequestError('Employment histories must be provided as a non-empty array.');
    }

    // Find the application matching userId and jobId
    const application = await prisma.application.findFirst({
        where: {
            UserID: userId,
            JobID: jobId,
        },
    });

    if (!application) {
        throw new NotFoundError('No application found for the given user and job.');
    }

    // Prepare employment history records with ApplicationID
    const recordsToInsert = employmentHistories.map(history => ({
        ApplicationID: application.ApplicationID,
        PostHeld: history.PostHeld,
        Institution: history.Institution,
        FromDate: history.FromDate ? new Date(history.FromDate) : null,
        ToDate: history.ToDate ? new Date(history.ToDate) : null,
        LastSalary: history.LastSalary,
    }));

    // Insert many employment histories
    const createdRecords = await prisma.employmenthistories.createMany({
        data: recordsToInsert,
    });

    return createdRecords;
};

// Submit Application References
exports.submitApplicationReferences = async (userId, jobId, references) => {
    if (!Array.isArray(references) || references.length === 0) {
        throw new BadRequestError('At least one reference is required.');
    }

    // Find the corresponding ApplicationID
    const existingApplication = await prisma.application.findFirst({
        where: {
            UserID: userId,
            JobID: jobId
        }
    });

    if (!existingApplication) {
        throw new BadRequestError('No matching application found for this user and job.');
    }

    // Attach ApplicationID to each reference
    const formattedReferences = references.map(ref => ({
        ApplicationID: existingApplication.ApplicationID,
        Name: ref.Name,
        Designation: ref.Designation,
        Address: ref.Address
    }));

    // Insert references in bulk
    const createdReferences = await prisma.applicationreferences.createMany({
        data: formattedReferences,
        skipDuplicates: true
    });

    return createdReferences;
};

//Save Application Attachments
exports.saveApplicationAttachment = async (applicationId, fileType, filePath) => {
    // 1. Validate input
    if (!applicationId || !fileType || !filePath) {
        throw new BadRequestError('Application ID, File type, and File path are required to save attachment.');
    }

    // 2. verify the application exists
    const application = await prisma.application.findUnique({
        where: { ApplicationID: applicationId },
    });

    if (!application) {
        throw new NotFoundError('Application not found for the given ApplicationID.');
    }

    // 3. Create attachment record
    const attachment = await prisma.applicationattachments.create({
        data: {
            ApplicationID: applicationId,
            FileType: fileType,
            FilePath: filePath,
            UploadedAt: new Date(),
        },
    });

    return attachment;
};

// Save GCE O/L results for an application
exports.submitGceOlResults = async (userId, jobId, olResults) => {
    if (!Array.isArray(olResults) || olResults.length === 0) {
        throw new BadRequestError('O/L results must be provided as a non-empty array.');
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

    // 2. Prepare O/L result records
    const recordsToInsert = olResults.map(result => ({
        ApplicationID: application.ApplicationID,
        Subject: result.Subject,
        Grade: result.Grade,
    }));

    // 3. Save O/L results
    const createdResults = await prisma.gce_ol_results.createMany({
        data: recordsToInsert,
    });

    return createdResults;
};

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