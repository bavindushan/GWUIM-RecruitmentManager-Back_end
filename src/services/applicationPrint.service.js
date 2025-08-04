const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { NotFoundError } = require('../utils/AppError');

// Load the template based on application type
async function loadTemplate(applicationType) {
    const fileName = applicationType === 'Academic'
        ? 'academic_template.pdf'
        : 'non_academic_template.pdf';

    const templatePath = path.join(__dirname, '..', '..', 'templates', fileName);

    if (!fs.existsSync(templatePath)) {
        throw new NotFoundError(`Template not found for type: ${applicationType}`);
    }

    const templateBytes = fs.readFileSync(templatePath);
    return await PDFDocument.load(templateBytes);
}

// Main function to generate filled PDF
exports.generateApplicationPDF = async (applicationID) => {
    // 1. Fetch application and user data (will complete later)
    const application = await fetchApplicationData(applicationID);
    // 2. Load appropriate template
    // 3. Fill fields using pdf-lib
    // 4. Return PDF buffer or save to disk (based on your design)
};

// STEP 1: Fetch application and related data
async function fetchApplicationData(applicationID) {
    const application = await prisma.application.findUnique({
        where: { ApplicationID: applicationID },
        include: {
            user: true,
            jobvacancy: {
                include: {
                    applicationtemplate: true
                }
            },
            applicationgeneraldetails: true,
            applicationreferences: true,
            employmenthistories: true,
            experiencedetails: true,
            gce_al_results: true,
            gce_ol_results: true,
            languageproficiencies: true,
            professionalqualifications: true,
            researchandpublications: true,
            specialqualifications: true,
            universityeducations: true,
            additionalinfo: true
        }
    });

    if (!application) {
        throw new NotFoundError('Application not found');
    }

    return application;
}


// STEP 2: Generate PDF from template
exports.generateApplicationPDF = async (applicationID) => {
    const application = await fetchApplicationData(applicationID);

    const applicationType = application.jobvacancy?.applicationtemplate?.Type || 'NonAcademic'; // Fallback
    const templateDoc = await loadTemplate(applicationType);

    const pdfDoc = await PDFDocument.create();
    const [templatePage] = await pdfDoc.copyPages(templateDoc, [0]);
    pdfDoc.addPage(templatePage);

    // Step 3 will insert text into `templatePage`
    return { pdfDoc, page: templatePage, application };
};