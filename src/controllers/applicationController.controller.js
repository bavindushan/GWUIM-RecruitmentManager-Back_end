const applicationService = require('../services/applicationService.service');
const catchAsync = require('../utils/catchAsync');
const { BadRequestError } = require('../utils/AppError');

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
