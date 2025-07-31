const path = require('path');
const fs = require('fs');
const catchAsync = require('../utils/catchAsync');
const { BadRequestError, NotFoundError } = require('../utils/AppError');

// Upload a template file and return the path
exports.uploadTemplateFile = catchAsync(async (req, res, next) => {
    if (!req.file) {
        throw new BadRequestError('No file uploaded.');
    }

    const filePath = `/uploads/templates/${req.file.filename}`;

    res.status(201).json({
        status: 'success',
        message: 'File uploaded successfully.',
        data: {
            filePath
        }
    });
});

exports.deleteTemplateFile = catchAsync(async (req, res, next) => {
    const { filename } = req.params;

    if (!filename) {
        throw new BadRequestError('Filename parameter is required.');
    }

    const filePath = path.join(__dirname, '..', '..', 'uploads', 'templates', filename);

    if (!fs.existsSync(filePath)) {
        throw new NotFoundError('File not found');
    }

    fs.unlinkSync(filePath);

    res.status(200).json({
        status: 'success',
        message: 'File deleted successfully',
    });
});