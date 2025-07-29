const jobService = require('../services/jobService.service');
const catchAsync = require('../utils/catchAsync');
const {NotFoundError} = require('../utils/AppError');


// Get all jobs
exports.getAllJobs = catchAsync(async (req, res, next) => {
    const jobs = await jobService.getAllJobs();

    res.status(200).json({
        status: 'success',
        results: jobs.length,
        data: {
            jobs,
        },
    });
});

// Get filtered jobs
exports.getFilteredJobs = catchAsync(async (req, res, next) => {
    const filters = {
        department: req.query.department,
        type: req.query.type,
        level: req.query.level,
        closingDate: req.query.closingDate, // YYYY-MM-DD
    };

    const jobs = await jobService.getFilteredJobs(filters);

    res.status(200).json({
        status: 'success',
        results: jobs.length,
        data: {
            jobs,
        },
    });
});

exports.getJobById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const job = await jobService.getJobById(id);

    if (!job) {
        return next(new NotFoundError('Job not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: job,
    });
});