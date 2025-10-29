// controllers/applicationPrint.controller.js
const { generateApplicationPDF } = require('../services/applicationPrint.service');
const { NotFoundError, BadRequestError } = require('../utils/AppError');

exports.downloadApplication = async (req, res, next) => {
    try {
        const { applicationId } = req.params;

        if (!applicationId) {
            throw new NotFoundError('Application ID is required');
        }

        const appId = parseInt(applicationId, 10);

        if (isNaN(appId)) {
            throw new BadRequestError('Invalid Application ID');
        }

        // Call your PDF generator service
        const pdfBytes = await generateApplicationPDF(appId);

        if (!pdfBytes) {
            throw new NotFoundError('Failed to generate application PDF');
        }

        // Set response headers for PDF download
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=application_${appId}.pdf`,
            'Content-Length': pdfBytes.length,
        });

        return res.send(Buffer.from(pdfBytes));
    } catch (error) {
        console.error('Download Application Error:', error); // ✅ Full error log
        next(error); // Let your error middleware handle it
    }
};
