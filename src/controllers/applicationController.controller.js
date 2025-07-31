const applicationService = require('../services/applicationService.service');
const catchAsync = require('../utils/catchAsync');
const { AppError, BadRequestError } = require('../utils/AppError');

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
