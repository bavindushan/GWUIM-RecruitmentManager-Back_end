const { generateApplicationPDF } = require('../services/applicationPrint.service');
const { NotFoundError } = require('../utils/AppError');

exports.downloadApplication = async (req, res, next) => {
    try {
        const { applicationId } = req.params;

        if (!applicationId) {
            throw new NotFoundError('Application ID is required');
        }

        // Call your PDF generator service to get PDF bytes
        const pdfBytes = await generateApplicationPDF(applicationId);

        if (!pdfBytes) {
            throw new NotFoundError('Failed to generate application PDF');
        }

        // Set response headers for PDF download
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=application_${applicationId}.pdf`,
            'Content-Length': pdfBytes.length,
        });

        return res.send(Buffer.from(pdfBytes));
    } catch (error) {
        next(error);
    }
};
