const applicationService = require('../services/applicationService.service');
const catchAsync = require('../utils/catchAsync');
const { AppError, BadRequestError } = require('../utils/AppError');
const fs = require('fs');
const path = require('path')

// Delete application by application ID
exports.deleteApplication = catchAsync(async (req, res, next) => {
    const userId = req.user?.id; // logged-in applicant
    const applicationId = parseInt(req.params.applicationId);

    if (!applicationId) {
        return next(new BadRequestError('Application ID is required'));
    }

    await applicationService.deleteApplication(userId, applicationId);

    res.status(200).json({
        status: 'success',
        message: 'Application deleted successfully'
    });
});

// Get university educations by jobId
exports.getUniversityEducationsByJob = catchAsync(async (req, res, next) => {
    const userId = req.user?.id;
    const jobId = parseInt(req.params.jobId, 10);

    if (!jobId) {
        throw new BadRequestError('Job ID is required.');
    }

    const records = await applicationService.getUniversityEducationsByJob(userId, jobId);

    if (!records || records.length === 0) {
        throw new NotFoundError('No university education records found for this job.');
    }

    res.status(200).json({
        status: 'success',
        data: records,
    });
});

// For cv downloads
exports.downloadCV = async (req, res, next) => {
    try {
        const { applicationId } = req.params;

        const cvPath = await applicationService.downloadCVByApplicationId(parseInt(applicationId));

        // Send file
        return res.download(cvPath, `CV_${applicationId}${path.extname(cvPath)}`);
    } catch (error) {
        next(error);
    }
};

// Change application status (admin)
exports.changeApplicationStatus = catchAsync(async (req, res, next) => {
    const { applicationId } = req.params;
    const { status, Remarks } = req.body;

    const result = await applicationService.changeApplicationStatus(
        parseInt(applicationId),
        status,
        Remarks || ''
    );

    res.status(200).json({
        status: 'success',
        message: result.message
    });
});

// Get all applications (admin)
exports.getAllApplications = catchAsync(async (req, res, next) => {
    const applications = await applicationService.getAllApplications();

    res.status(200).json({
        status: "success",
        data: applications,
    });
});


// Check if already applied
exports.checkAlreadyApplied = async (req, res, next) => {
    try {
        const userId = req.user.id; // from auth middleware
        const { jobId } = req.query; // jobId as query param ?jobId=123

        const result = await applicationService.checkAlreadyApplied(userId, parseInt(jobId));

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// Delete all related Academic records of an application
exports.deleteAllRelatedAC = catchAsync(async (req, res, next) => {
    const { applicationId } = req.params;

    const result = await applicationService.deleteAllRelatedAC(applicationId);

    res.status(200).json({
        status: 'success',
        message: "All Academic records deleted successfully.",
        data: result,
    });
});

// Delete all related Non Academic records of an application
exports.deleteAllRelatedNA = catchAsync(async (req, res, next) => {
    let { applicationId } = req.params;

    // Convert to integer
    applicationId = parseInt(applicationId, 10);

    // Validate applicationId
    if (isNaN(applicationId) || applicationId <= 0) {
        throw new BadRequestError('Invalid application ID. It must be a positive integer.');
    }

    const result = await applicationService.deleteAllRelatedNA(applicationId);

    res.status(200).json({
        status: 'success',
        message: "All Non Academic records deleted successfully.",
        data: result,
    });
});

// Add Additional Info to an application
exports.addAdditionalInfo = catchAsync(async (req, res, next) => {
    const applicationId = req.body.applicationId;
    const content = req.body.content;

    if (!applicationId || !content) {
        throw new BadRequestError("Application ID and content are required.");
    }

    const result = await applicationService.saveAdditionalInfo(applicationId, content);

    res.status(201).json({
        status: "success",
        message: "Additional info saved successfully.",
        data: result
    });
});

// Submit Secondary Educations
exports.submitSecondaryEducations = catchAsync(async (req, res, next) => {
    const userId = req.user?.id; // Logged-in user
    const { applicationId, secondaryEducations } = req.body;

    if (!applicationId || !Array.isArray(secondaryEducations) || secondaryEducations.length === 0) {
        throw new BadRequestError('Application ID and a non-empty secondaryEducations array are required.');
    }

    const result = await applicationService.submitSecondaryEducations(applicationId, secondaryEducations);

    res.status(201).json({
        status: 'success',
        message: 'Secondary education records submitted successfully.',
        data: result,
    });
});

// Add First Degree Subjects
exports.addFirstDegreeSubjects = catchAsync(async (req, res, next) => {
    const { universityEducationId, subjects } = req.body;

    if (!universityEducationId || !Array.isArray(subjects) || subjects.length === 0) {
        throw new BadRequestError('UniversityEducationID and a non-empty subjects array are required.');
    }

    const result = await applicationService.addFirstDegreeSubjects(universityEducationId, subjects);

    res.status(201).json({
        status: 'success',
        message: 'First degree subjects added successfully.',
        data: result,
    });
});

// Get application status by jobId
exports.getApplicationStatus = catchAsync(async (req, res, next) => {
    const userId = req.user?.id;
    const jobId = parseInt(req.params.jobId);

    if (!jobId || isNaN(jobId)) {
        throw new BadRequestError('A valid Job ID is required.');
    }

    const status = await applicationService.getApplicationStatus(userId, jobId);

    res.status(200).json({
        status: 'success',
        message: 'Application status retrieved successfully.',
        data: status,
    });
});

// Submit University Educations
exports.submitUniversityEducations = catchAsync(async (req, res, next) => {
    const userId = req.user?.id;
    const { jobId, universityEducations } = req.body;

    if (!jobId || !Array.isArray(universityEducations) || universityEducations.length === 0) {
        throw new BadRequestError('Job ID and a non-empty universityEducations array are required.');
    }

    const result = await applicationService.submitUniversityEducations(userId, jobId, universityEducations);

    res.status(201).json({
        status: 'success',
        message: 'University education records submitted successfully.',
        data: result,
    });
});

// Submit Special Qualifications
exports.submitSpecialQualifications = catchAsync(async (req, res, next) => {
    const userId = req.user?.id;
    const { jobId, specialQualifications } = req.body;

    if (!jobId || !Array.isArray(specialQualifications) || specialQualifications.length === 0) {
        throw new BadRequestError('Job ID and a non-empty specialQualifications array are required.');
    }

    const result = await applicationService.submitSpecialQualifications(userId, jobId, specialQualifications);

    res.status(201).json({
        status: 'success',
        message: 'Special qualifications submitted successfully.',
        data: result,
    });
});

// Submit Research and Publications
exports.submitResearchAndPublications = catchAsync(async (req, res, next) => {
    const userId = req.user?.id;
    const { jobId, publications } = req.body;

    if (!jobId || !Array.isArray(publications) || publications.length === 0) {
        throw new BadRequestError('Job ID and a non-empty publications array are required.');
    }

    const result = await applicationService.submitResearchAndPublications(userId, jobId, publications);

    res.status(201).json({
        status: 'success',
        message: 'Research and publications submitted successfully.',
        data: result,
    });
});

// Submit Professional Qualifications
exports.submitProfessionalQualifications = catchAsync(async (req, res, next) => {
    const userId = req.user?.id;
    const { jobId, qualifications } = req.body;

    if (!jobId || !Array.isArray(qualifications) || qualifications.length === 0) {
        throw new BadRequestError('Job ID and a non-empty qualifications array are required.');
    }

    const result = await applicationService.submitProfessionalQualifications(userId, jobId, qualifications);

    res.status(201).json({
        status: 'success',
        message: 'Professional qualifications submitted successfully.',
        data: result,
    });
});

// Submit Language Proficiencies
exports.submitLanguageProficiencies = catchAsync(async (req, res, next) => {
    const userId = req.user?.id;
    const { jobId, languageProficiencies } = req.body;

    if (!jobId || !Array.isArray(languageProficiencies) || languageProficiencies.length === 0) {
        throw new BadRequestError('Job ID and a non-empty languageProficiencies array are required.');
    }

    const result = await applicationService.submitLanguageProficiencies(userId, jobId, languageProficiencies);

    res.status(201).json({
        status: 'success',
        message: 'Language proficiencies submitted successfully.',
        data: result,
    });
});

// Submit Experience Details
exports.submitExperienceDetails = catchAsync(async (req, res, next) => {
    const userId = req.user?.id;
    const { jobId, experienceDetails } = req.body;

    if (!jobId || !Array.isArray(experienceDetails) || experienceDetails.length === 0) {
        throw new BadRequestError('Job ID and a non-empty experience details array are required.');
    }

    const result = await applicationService.submitExperienceDetails(userId, jobId, experienceDetails);

    res.status(201).json({
        status: 'success',
        message: 'Experience details submitted successfully.',
        data: result,
    });
});

// Submit Employment Histories
exports.submitEmploymentHistories = catchAsync(async (req, res, next) => {
    const userId = req.user?.id;
    const { jobId, employmentHistories } = req.body;

    if (!jobId || !Array.isArray(employmentHistories) || employmentHistories.length === 0) {
        throw new BadRequestError('Job ID and a non-empty employment histories array are required.');
    }

    const result = await applicationService.submitEmploymentHistories(userId, jobId, employmentHistories);

    res.status(201).json({
        status: 'success',
        message: 'Employment histories submitted successfully.',
        data: result,
    });
});

// Submit Application References
exports.submitApplicationReferences = catchAsync(async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { jobId, references } = req.body;

        if (!jobId || !references) {
            throw new AppError('jobId and references are required', 400);
        }

        const result = await applicationService.submitApplicationReferences(userId, jobId, references);

        res.status(200).json({
            status: 'success',
            message: 'Application references submitted successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
});

// Save Application Attachment
exports.saveApplicationAttachment = catchAsync(async (req, res, next) => {
    const { applicationId, fileType, filePath } = req.body;

    if (!applicationId || !fileType || !filePath) {
        throw new BadRequestError('Application ID, file type, and file path are required.');
    }

    const savedAttachment = await applicationService.saveApplicationAttachment(applicationId, fileType, filePath);

    res.status(201).json({
        status: 'success',
        message: 'Application attachment saved successfully.',
        data: savedAttachment,
    });
});

// Submit GCE O/L Results
exports.submitGceOlResults = catchAsync(async (req, res, next) => {
    const userId = req.user?.id;
    const { jobId, olResults } = req.body;

    if (!jobId || !Array.isArray(olResults) || olResults.length === 0) {
        throw new BadRequestError('Job ID and a non-empty O/L results array are required.');
    }

    const result = await applicationService.submitGceOlResults(userId, jobId, olResults);

    res.status(201).json({
        status: 'success',
        message: 'GCE O/L results submitted successfully.',
        data: result,
    });
});

// Submit GCE A/L Results
exports.submitGceAlResults = catchAsync(async (req, res, next) => {
    const userId = req.user?.id;
    const { jobId, alResults } = req.body;

    if (!jobId || !Array.isArray(alResults) || alResults.length === 0) {
        throw new BadRequestError('Job ID and a non-empty A/L results array are required.');
    }

    const result = await applicationService.submitGceAlResults(userId, jobId, alResults);

    res.status(201).json({
        status: 'success',
        message: 'GCE A/L results submitted successfully.',
        data: result,
    });
});

// Submit General Details
exports.submitGeneralDetails = catchAsync(async (req, res, next) => {
    const userId = req.user?.id;
    const { jobId, generalDetails } = req.body;

    if (!jobId || !generalDetails || typeof generalDetails !== 'object') {
        throw new BadRequestError('Job ID and general details are required.');
    }

    const saved = await applicationService.submitGeneralDetails(userId, jobId, generalDetails);

    res.status(201).json({
        status: 'success',
        message: 'General application details submitted successfully.',
        data: saved,
    });
});
