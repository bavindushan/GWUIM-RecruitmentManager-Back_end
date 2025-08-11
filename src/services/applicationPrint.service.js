const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { NotFoundError } = require('../utils/AppError');

// Load the template PDF based on application type
async function loadTemplate(applicationType) {
    const fileName = applicationType === 'Academic'
        ? 'academic_template.pdf'
        : 'non-academic_template.pdf';

    const templatePath = path.join(__dirname, '..', '..', 'templates', fileName);

    if (!fs.existsSync(templatePath)) {
        throw new NotFoundError(`Template not found for type: ${applicationType}`);
    }

    const templateBytes = fs.readFileSync(templatePath);
    return await PDFDocument.load(templateBytes);
}

// Load mapping JSON for field coordinates
function loadMapping(fileName) {
    const mappingPath = path.join(__dirname, '..', '..', 'templates', fileName);
    if (!fs.existsSync(mappingPath)) {
        throw new Error(`Mapping file not found: ${fileName}`);
    }
    return JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
}

// Fetch application and all related data from DB
async function fetchApplicationData(applicationID) {
    const application = await prisma.application.findUnique({
        where: { ApplicationID: applicationID },
        include: {
            user: true,
            jobvacancy: { include: { applicationtemplate: true } },
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
            additionalinfo: true,
            physicalattributes_na: true,
        }
    });

    if (!application) {
        throw new NotFoundError('Application not found');
    }

    return application;
}

// Helper to format dates as dd/mm/yyyy or empty string
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// Helper to draw tabular data on PDF page
function drawTable(page, dataArray, mappingSection, font) {
    if (!dataArray || !mappingSection) return;
    let yPos = mappingSection.startY;
    const startX = mappingSection.startX;
    const rowHeight = mappingSection.rowHeight || 15;
    const fontSize = mappingSection.fontSize || 10;

    for (const item of dataArray) {
        for (const [colName, offsetX] of Object.entries(mappingSection.columns)) {
            let text = item[colName] !== undefined && item[colName] !== null ? String(item[colName]) : '';

            // Format dates in table if columns hint date
            if (colName.toLowerCase().includes('date') || colName.toLowerCase().includes('year')) {
                text = formatDate(text) || text;
            }

            page.drawText(text, {
                x: startX + offsetX,
                y: yPos,
                size: fontSize,
                font,
                color: rgb(0, 0, 0)
            });
        }
        yPos -= rowHeight;
    }
}

// Common function to draw headers, logo, declaration, and signature placeholders
async function drawCommonSections(templateDoc, page, mapping) {
    const font = await templateDoc.embedFont(StandardFonts.Helvetica);

    // Draw logo if exists
    const logoPath = path.join(__dirname, '..', 'utils', 'assets', 'university_logo.png');
    if (fs.existsSync(logoPath)) {
        const logoImage = await templateDoc.embedPng(fs.readFileSync(logoPath));
        page.drawImage(logoImage, {
            x: mapping.logo.x,
            y: mapping.logo.y,
            width: mapping.logo.width,
            height: mapping.logo.height
        });
    }

    // Draw titles
    page.drawText('Gampaha Wickramarachchi University of Indigenous Medicine, Sri Lanka', {
        x: mapping.universityTitle.x,
        y: mapping.universityTitle.y,
        size: mapping.universityTitle.fontSize,
        font,
        color: rgb(0, 0, 0)
    });

    page.drawText(mapping.formTitle.text, {
        x: mapping.formTitle.x,
        y: mapping.formTitle.y,
        size: mapping.formTitle.fontSize,
        font,
        color: rgb(0, 0, 0)
    });

    // Draw declaration text if exists
    if (mapping.declaration?.text) {
        page.drawText(mapping.declaration.text, {
            x: mapping.declaration.textX,
            y: mapping.declaration.textY,
            size: mapping.declaration.fontSize || 10,
            font,
            color: rgb(0, 0, 0),
            maxWidth: 500,
            lineHeight: 12,
        });
    }

    // Draw signature and date placeholders
    page.drawText('Date:', {
        x: mapping.signature.dateX,
        y: mapping.signature.dateY,
        size: mapping.signature.fontSize || 10,
        font,
        color: rgb(0, 0, 0)
    });

    page.drawText('Signature:', {
        x: mapping.signature.signatureX,
        y: mapping.signature.signatureY,
        size: mapping.signature.fontSize || 10,
        font,
        color: rgb(0, 0, 0)
    });

    return font;
}

// Main function to generate PDF (generic, chooses Academic or Non-Academic)
exports.generateApplicationPDF = async (applicationID) => {
    const application = await fetchApplicationData(applicationID);

    // Determine type & load corresponding template and mapping
    const applicationType = application.jobvacancy?.applicationtemplate?.Type || 'Non_Academic';
    const templateFileName = applicationType === 'Academic' ? 'academic_template.pdf' : 'non-academic_template.pdf';
    const mappingFileName = applicationType === 'Academic' ? 'academic_mapping.json' : 'non-academic_mapping.json';

    const templateDoc = await loadTemplate(applicationType);
    const mapping = loadMapping(mappingFileName);

    const page = templateDoc.getPages()[0];

    // Draw headers, logo, declaration, and signature placeholders
    const font = await drawCommonSections(templateDoc, page, mapping);

    // Draw application general details
    if (mapping.fields && application.applicationgeneraldetails) {
        for (const [field, coords] of Object.entries(mapping.fields)) {
            let text = application.applicationgeneraldetails[field] || '';

            // Format date fields explicitly
            if (field.toLowerCase().includes('date') || field.toLowerCase() === 'dob') {
                text = formatDate(text);
            }

            page.drawText(text.toString(), {
                x: coords.x,
                y: coords.y,
                size: coords.fontSize || 10,
                font,
                color: rgb(0, 0, 0)
            });
        }
    }

    // Draw tables with related data
    if (mapping.tables) {
        if (mapping.tables.SecondaryEducation) {
            drawTable(page, application.gce_ol_results, mapping.tables.SecondaryEducation, font);
        }
        if (mapping.tables.HigherEducation) {
            drawTable(page, application.gce_al_results, mapping.tables.HigherEducation, font);
        }
        if (mapping.tables.UniversityEducation) {
            drawTable(page, application.universityeducations, mapping.tables.UniversityEducation, font);
        }
        if (mapping.tables.ProfessionalQualifications) {
            drawTable(page, application.professionalqualifications, mapping.tables.ProfessionalQualifications, font);
        }
        if (mapping.tables.LanguageProficiency) {
            drawTable(page, application.languageproficiencies, mapping.tables.LanguageProficiency, font);
        }
        if (mapping.tables.EmployeeRecords) {
            drawTable(page, application.employmenthistories, mapping.tables.EmployeeRecords, font);
        }
    }

    // Optionally draw special qualifications & experience (if mapping present)
    if (application.experiencedetails && mapping.experience) {
        let y = mapping.experience.y;
        const x = mapping.experience.x;
        const fontSize = mapping.experience.fontSize || 11;
        for (const exp of application.experiencedetails) {
            const text = exp.Description || '';
            page.drawText(text, { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
            y -= 15;
        }
    }

    if (application.specialqualifications && mapping.specialQualifications) {
        let y = mapping.specialQualifications.y;
        const x = mapping.specialQualifications.x;
        const fontSize = mapping.specialQualifications.fontSize || 11;
        for (const sq of application.specialqualifications) {
            const text = sq.Description || '';
            page.drawText(text, { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
            y -= 15;
        }
    }

    // Save and return PDF bytes
    return await templateDoc.save();
};
