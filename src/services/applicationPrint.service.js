const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
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

// Utility to load coordinate mapping JSON
function loadMapping(fileName) {
    const mappingPath = path.join(__dirname, '..', '..', 'templates', fileName);
    if (!fs.existsSync(mappingPath)) {
        throw new Error(`Mapping file not found: ${fileName}`);
    }
    return JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
}

// Fetch application and related data from DB
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
            additionalinfo: true,
            physicalattributes_na: true
        }
    });

    if (!application) {
        throw new NotFoundError('Application not found');
    }

    return application;
}

// Main generator function
exports.generateApplicationPDF = async (applicationID) => {
    // Step A – Fetch DB data
    const application = await fetchApplicationData(applicationID);

    // Step B – Determine template type and load PDF
    const applicationType = application.jobvacancy?.applicationtemplate?.Type || 'Non_Academic';
    const templateDoc = await loadTemplate(applicationType);

    // Step C – Load coordinates mapping
    const mapping = loadMapping('non_academic_mapping.json'); // for Non Academic

    // Step D – Load fonts and assets (logo)
    const font = await templateDoc.embedFont(StandardFonts.Helvetica);
    const logoPath = path.join(__dirname, '..', 'utils', 'assets', 'university_logo.png');
    const logoImage = fs.existsSync(logoPath)
        ? await templateDoc.embedPng(fs.readFileSync(logoPath))
        : null;

    const page = templateDoc.getPages()[0];

    // Step E – Draw static header (logo + title)
    if (logoImage) {
        page.drawImage(logoImage, {
            x: mapping.logo.x,
            y: mapping.logo.y,
            width: mapping.logo.width,
            height: mapping.logo.height
        });
    }
    page.drawText('Gampaha Wickramarachchi University of Indigenous Medicine, Sri Lanka', {
        x: mapping.universityTitle.x,
        y: mapping.universityTitle.y,
        size: mapping.universityTitle.fontSize,
        font,
        color: rgb(0, 0, 0)
    });
    page.drawText('Form of Application', {
        x: mapping.formTitle.x,
        y: mapping.formTitle.y,
        size: mapping.formTitle.fontSize,
        font
    });

    // Step F – Draw applicant general details dynamically
    if (mapping.fields && application.applicationgeneraldetails) {
        for (const [field, coords] of Object.entries(mapping.fields)) {
            const text = application.applicationgeneraldetails[field] || '';
            page.drawText(text, {
                x: coords.x,
                y: coords.y,
                size: coords.fontSize || 10,
                font,
                color: rgb(0, 0, 0)
            });
        }
    }

    // Helper to draw tabular data lists with proper column positioning
    function drawTable(dataArray, mappingSection) {
        if (!dataArray || !mappingSection) return;
        let yPos = mappingSection.startY;
        const startX = mappingSection.startX;
        const rowHeight = mappingSection.rowHeight || 15;
        const fontSize = mappingSection.fontSize || 10;

        for (const item of dataArray) {
            for (const [colName, offsetX] of Object.entries(mappingSection.columns)) {
                const text = item[colName] !== undefined && item[colName] !== null ? String(item[colName]) : '';
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

    // Step G – Draw tables with data
    drawTable(application.gce_ol_results, mapping.tables.GCE_OL);
    drawTable(application.gce_al_results, mapping.tables.GCE_AL);
    drawTable(application.universityeducations, mapping.tables.UniversityEducation);
    drawTable(application.professionalqualifications, mapping.tables.ProfessionalQualifications);

    // Optional: Draw experience and special qualifications as plain text
    if (application.experiencedetails && mapping.experience) {
        let y = mapping.experience.y;
        const x = mapping.experience.x;
        const fontSize = mapping.experience.fontSize || 11;

        for (const exp of application.experiencedetails) {
            const text = `${exp.Position || ''} at ${exp.CompanyName || ''} (${exp.FromYear || ''} - ${exp.ToYear || ''})`;
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

    // Step H – Draw declaration, date, signature placeholders
    if (mapping.declaration) {
        page.drawText(mapping.declaration.text, {
            x: mapping.declaration.textX,
            y: mapping.declaration.textY,
            size: mapping.declaration.fontSize || 10,
            font,
            color: rgb(0, 0, 0)
        });
    }

    if (mapping.signature) {
        page.drawText('Date: ' + new Date().toLocaleDateString(), {
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
    }

    // Step I – Save and return PDF bytes
    const pdfBytes = await templateDoc.save();
    return pdfBytes;
};
