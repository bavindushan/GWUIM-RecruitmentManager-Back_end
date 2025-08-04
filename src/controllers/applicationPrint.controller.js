const puppeteer = require('puppeteer');
const path = require('path');
const ejs = require('ejs');
const { getApplicationForPrint } = require('../services/applicationPrint.service');
const { NotFoundError } = require('../utils/AppError');

exports.downloadApplication = async (req, res, next) => {
    try {
        const { applicationId } = req.params;

        const { templateType, application } = await getApplicationForPrint(applicationId);

        if (!templateType) {
            throw new NotFoundError('Template type not found for this application.');
        }

        // Set the template file path
        const templatePath = path.join(
            __dirname,
            '..',
            'templates',
            templateType === 'Academic' ? 'academic-template.ejs' : 'non-academic-template.ejs'
        );

        // Render EJS template to HTML
        const html = await ejs.renderFile(templatePath, { application });

        // Launch Puppeteer and generate PDF
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({ format: 'A4' });

        await browser.close();

        // Send PDF as response
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=application_${applicationId}.pdf`,
            'Content-Length': pdfBuffer.length,
        });

        return res.send(pdfBuffer);
    } catch (err) {
        next(err);
    }
};
