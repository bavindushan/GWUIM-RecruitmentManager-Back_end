const jobService = require('../services/jobService.service');
const catchAsync = require('../utils/catchAsync');

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
