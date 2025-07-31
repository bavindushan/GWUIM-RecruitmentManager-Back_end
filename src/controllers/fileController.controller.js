const catchAsync = require('../utils/catchAsync');
const fileService = require('../services/fileService.service');
const BadRequestError = require('../utils/AppError');

// DELETE /api/files/:filename
exports.deleteAttachment = catchAsync(async (req, res, next) => {
    const { filename } = req.params;

    await fileService.deleteFileByFilename(filename);

    res.status(200).json({
        status: 'success',
        message: 'File deleted successfully',
    });
});

exports.uploadAttachment = catchAsync(async (req, res, next) => {
    if (!req.file) {
        throw new BadRequestError('No file uploaded');
    }

    const fileUrl = await fileService.handleFileUpload(req);

    res.status(200).json({
        status: 'success',
        message: 'File uploaded successfully',
        data: { fileUrl },
    });
});
