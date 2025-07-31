const applicationTemplateService = require('../services/applicationTemplateService.service');
const { BadRequestError } = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

exports.uploadApplicationTemplate = catchAsync(async (req, res, next) => {
    const adminId = req.user?.id;
    const { Type, FilePath } = req.body;

    if (!Type || !FilePath) {
        throw new BadRequestError('Type and FilePath are required.');
    }

    const newTemplate = await applicationTemplateService.uploadApplicationTemplate(
        { Type, FilePath },
        adminId
    );

    res.status(201).json({
        status: 'success',
        message: 'Application template uploaded successfully.',
        data: newTemplate,
    });
});
