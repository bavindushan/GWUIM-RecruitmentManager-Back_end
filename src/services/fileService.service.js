const fs = require('fs');
const path = require('path');
const { NotFoundError, BadRequestError } = require('../utils/AppError');

exports.handleFileUpload = async (req) => {
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/resumes/${req.file.filename}`;
    return fileUrl;
};

exports.deleteFileByFilename = (filename) => {
    if (!filename) {
        throw new BadRequestError('Filename is required');
    }

    const filePath = path.join(__dirname, '..', '..', 'uploads', 'resumes', filename);

    if (!fs.existsSync(filePath)) {
        throw new NotFoundError('File not found');
    }

    fs.unlinkSync(filePath);
};
