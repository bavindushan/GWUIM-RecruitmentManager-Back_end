const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { NotFoundError } = require('../utils/AppError');

// Label mappings for nicer display names of general fields
const generalFieldLabels = {
    Post: 'Post',
    FullName: 'Full Name',
    PermanentAddress: 'Address',
    PhoneNumber: 'Phone Number',
    NIC: 'NIC',
    Email: 'Email',
    DOB: 'Date of Birth',
    Age_Y: 'Age (Years)',
    Age_M: 'Age (Months)',
    Age_D: 'Age (Days)',
    CivilStatus: 'Civil Status',
    Gender: 'Gender',
    CitizenshipType: 'Citizenship Type',
    CitizenshipDetails: 'Citizenship Details',
    EthnicityOrReligion: 'Ethnicity / Religion',
    HeightFeet: 'Height Feet',
    HeightInches: 'Inches',
    ChestInches: 'Chest (Inches)',
};

// Load template and mapping based on application type
async function loadTemplateAndMapping(applicationType) {
    const baseName = applicationType === 'Academic' ? 'academic' : 'non_academic';

    // Template
    const templatePath = path.join(__dirname, '..', '..', 'uploads', 'templates', `${baseName}_template.pdf`);
    if (!fs.existsSync(templatePath)) throw new NotFoundError(`Template not found for type: ${applicationType}`);
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);

    // Mapping
    const mappingPath = path.join(__dirname, '..', '..', 'uploads', 'templates', `${baseName}_mapping.json`);
    if (!fs.existsSync(mappingPath)) throw new Error(`Mapping file not found: ${baseName}_mapping.json`);
    const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

    return { pdfDoc, mapping };
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

// Helper to split text into lines so they fit maxWidth given font & fontSize
function splitTextIntoLines(text, maxWidth, font, fontSize) {
    if (!text) return [''];
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const width = font.widthOfTextAtSize(testLine, fontSize);
        if (width > maxWidth) {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
}

// Draw wrapped text lines vertically with line height
function drawWrappedText(page, text, x, y, maxWidth, font, fontSize, lineHeight) {
    const lines = splitTextIntoLines(text, maxWidth, font, fontSize);
    lines.forEach((line, i) => {
        page.drawText(line, {
            x,
            y: y - i * lineHeight,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
        });
    });
    return lines.length;
}

// Helper to draw tabular data on PDF page
function drawTable(page, dataArray, mappingSection, font) {

    if (!dataArray || !mappingSection) return;
    let yPos = mappingSection.startY;
    const startX = mappingSection.startX;
    const rowHeight = mappingSection.rowHeight || 15;
    const fontSize = mappingSection.fontSize || 12;

    for (const item of dataArray) {
        for (const [colName, offsetX] of Object.entries(mappingSection.columns)) {
            let text = item[colName] !== undefined && item[colName] !== null ? String(item[colName]) : '';

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

// Draw headers, logo, declaration, and signature placeholders
async function drawCommonSections(templateDoc, page, mapping) {

    // Page references
    const pages = templateDoc.getPages();
    const page2 = pages[1] || templateDoc.addPage();

    const font = await templateDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await templateDoc.embedFont(StandardFonts.HelveticaBold);

    // Logo
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

    // Titles
    page.drawText('Gampaha Wickramarachchi University of Indigenous Medicine, Sri Lanka', {
        x: mapping.universityTitle.x,
        y: mapping.universityTitle.y,
        size: mapping.universityTitle.fontSize,
        font: helveticaBoldFont,
        color: rgb(0, 0, 0)
    });

    // Draw subtitle: use mapping.formTitle.text if exists, else fallback to fixed string
    const formTitleText = (mapping.formTitle && typeof mapping.formTitle.text === 'string')
        ? mapping.formTitle.text
        : 'Non Academic Application';

    page.drawText(formTitleText, {
        x: mapping.formTitle.x,
        y: mapping.formTitle.y,
        size: mapping.formTitle.fontSize,
        font,
        color: rgb(0, 0, 0)
    });

    // Declaration
    if (mapping.declaration?.text) {
        page2.drawText(mapping.declaration.text, {
            x: mapping.declaration.textX,
            y: mapping.declaration.textY,
            size: mapping.declaration.fontSize || 10,
            font,
            color: rgb(0, 0, 0),
            maxWidth: 500,
            lineHeight: 12,
        });
    }

    // Signature placeholders
    page2.drawText('Date:', {
        x: mapping.signature.dateX,
        y: mapping.signature.dateY,
        size: mapping.signature.fontSize || 10,
        font,
        color: rgb(0, 0, 0)
    });

    page2.drawText('Signature:', {
        x: mapping.signature.signatureX,
        y: mapping.signature.signatureY,
        size: mapping.signature.fontSize || 10,
        font,
        color: rgb(0, 0, 0)
    });

    return font;
}

// Main function to generate PDF
exports.generateApplicationPDF = async (applicationID) => {
    const application = await fetchApplicationData(applicationID);

    const applicationType = application.jobvacancy?.applicationtemplate?.Type || 'Non_Academic';
    const { pdfDoc: templateDoc, mapping } = await loadTemplateAndMapping(applicationType);

    const helveticaFont = await templateDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await templateDoc.embedFont(StandardFonts.HelveticaBold);

    const page = templateDoc.getPages()[0];
    const secondpage = templateDoc.getPages()[1];

    const font = await drawCommonSections(templateDoc, page, mapping);

    // === General Details on page 1 ===
    if (mapping.fields && application.applicationgeneraldetails) {
        const fontSize = 12;
        const lineHeight = 12;
        const maxWidth = 350;
        let lastGeneralDetailY = 0;

        for (const [field, coords] of Object.entries(mapping.fields)) {
            let label = generalFieldLabels[field] || field;
            let text = field === 'Post' ? (application.jobvacancy?.Title || '') : (application.applicationgeneraldetails[field] || '');

            if (field.toLowerCase().includes('date') || field.toLowerCase() === 'dob') {
                text = formatDate(text);
            }

            page.drawText(`${label}:`, {
                x: coords.x,
                y: coords.y,
                size: coords.fontSize || fontSize,
                font: helveticaBoldFont,
                color: rgb(0, 0, 0)
            });

            const linesCount = drawWrappedText(page, text.toString(), coords.x + 120, coords.y, maxWidth, font, fontSize, lineHeight);

            lastGeneralDetailY = Math.min(lastGeneralDetailY || coords.y, coords.y - (linesCount - 1) * lineHeight);
        }

        page.drawLine({
            start: { x: 40, y: lastGeneralDetailY - 10 },
            end: { x: 550, y: lastGeneralDetailY - 10 },
            thickness: 0.5,
            color: rgb(0, 0, 0),
        });
    }

    // === Tables ===
    if (mapping.tables) {
        // GCE O/L
        if (mapping.tables.GCE_OL && application.gce_ol_results?.length) {
            page.drawText("GCE O/L Results", {
                x: mapping.tables.GCE_OL.startX,
                y: mapping.tables.GCE_OL.startY + 20,
                size: 12,
                font: helveticaBoldFont,
                color: rgb(0, 0, 0)
            });
            drawTable(page, application.gce_ol_results, mapping.tables.GCE_OL, font);

            let lineY = mapping.tables.GCE_OL.startY - (application.gce_ol_results.length * (mapping.tables.GCE_OL.rowHeight || 15)) - 1;
            page.drawLine({
                start: { x: 40, y: lineY },
                end: { x: 550, y: lineY },
                thickness: 0.5,
                color: rgb(0, 0, 0),
            });
        }

        // GCE A/L
        if (mapping.tables.GCE_AL && application.gce_al_results?.length) {
            page.drawText("GCE A/L Results", {
                x: mapping.tables.GCE_AL.startX,
                y: mapping.tables.GCE_AL.startY + 20,
                size: 12,
                font: helveticaBoldFont,
                color: rgb(0, 0, 0)
            });
            drawTable(page, application.gce_al_results, mapping.tables.GCE_AL, font);

            let lineY = mapping.tables.GCE_AL.startY - (application.gce_al_results.length * (mapping.tables.GCE_AL.rowHeight || 15)) - 10;
            page.drawLine({
                start: { x: 40, y: lineY },
                end: { x: 550, y: lineY },
                thickness: 0.5,
                color: rgb(0, 0, 0),
            });
        }

        // University Education
        if (mapping.tables.UniversityEducation && application.universityeducations?.length) {
            page.drawText("University Education", {
                x: mapping.tables.UniversityEducation.startX,
                y: mapping.tables.UniversityEducation.startY + 20,
                size: 12,
                font: helveticaBoldFont,
                color: rgb(0, 0, 0)
            });
            drawTable(page, application.universityeducations, mapping.tables.UniversityEducation, font);

            let lineY = mapping.tables.UniversityEducation.startY - (application.universityeducations.length * (mapping.tables.UniversityEducation.rowHeight || 15)) - 10;
            page.drawLine({
                start: { x: 40, y: lineY },
                end: { x: 550, y: lineY },
                thickness: 0.5,
                color: rgb(0, 0, 0),
            });
        }

        // ====== SECOND PAGE ======
        let currentPage = secondpage;

        if (mapping.tables.ProfessionalQualifications && application.professionalqualifications?.length) {
            currentPage.drawText("Professional Qualifications", {
                x: mapping.tables.ProfessionalQualifications.startX,
                y: mapping.tables.ProfessionalQualifications.startY + 20,
                size: 12,
                font: helveticaBoldFont,
                color: rgb(0, 0, 0)
            });
            drawTable(currentPage, application.professionalqualifications, mapping.tables.ProfessionalQualifications, font);

            let lineY = mapping.tables.ProfessionalQualifications.startY - (application.professionalqualifications.length * (mapping.tables.ProfessionalQualifications.rowHeight || 15)) - 10;
            currentPage.drawLine({
                start: { x: 40, y: lineY },
                end: { x: 550, y: lineY },
                thickness: 0.5,
                color: rgb(0, 0, 0),
            });
        }

        if (mapping.tables.LanguageProficiency && application.languageproficiencies?.length) {
            currentPage.drawText("Language Proficiency", {
                x: mapping.tables.LanguageProficiency.startX,
                y: mapping.tables.LanguageProficiency.startY + 20,
                size: 12,
                font: helveticaBoldFont,
                color: rgb(0, 0, 0)
            });
            drawTable(currentPage, application.languageproficiencies, mapping.tables.LanguageProficiency, font);

            let lineY = mapping.tables.LanguageProficiency.startY - (application.languageproficiencies.length * (mapping.tables.LanguageProficiency.rowHeight || 15)) - 10;
            currentPage.drawLine({
                start: { x: 40, y: lineY },
                end: { x: 550, y: lineY },
                thickness: 0.5,
                color: rgb(0, 0, 0),
            });
        }

        if (mapping.tables.EmployeeRecords && application.employmenthistories?.length) {
            currentPage.drawText("Employment Histories", {
                x: mapping.tables.EmployeeRecords.startX,
                y: mapping.tables.EmployeeRecords.startY + 20,
                size: 12,
                font: helveticaBoldFont,
                color: rgb(0, 0, 0)
            });
            drawTable(currentPage, application.employmenthistories, mapping.tables.EmployeeRecords, font);

            let lineY = mapping.tables.EmployeeRecords.startY - (application.employmenthistories.length * (mapping.tables.EmployeeRecords.rowHeight || 15)) - 10;
            currentPage.drawLine({
                start: { x: 40, y: lineY },
                end: { x: 550, y: lineY },
                thickness: 0.5,
                color: rgb(0, 0, 0),
            });
        }
    }

    // === Experience details ===
    if (application.experiencedetails && mapping.experience) {
        secondpage.drawText("Experience Details:", {
            x: mapping.experience.x,
            y: mapping.experience.y + 15,
            size: mapping.experience.fontSize || 11,
            font: helveticaBoldFont,
            color: rgb(0, 0, 0)
        });

        let y = mapping.experience.y;
        const x = mapping.experience.x;
        const fontSize = mapping.experience.fontSize || 11;
        for (const exp of application.experiencedetails) {
            secondpage.drawText(exp.Description || '', { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
            y -= 15;
        }
    }

    // === Special qualifications ===
    if (application.specialqualifications && mapping.specialQualifications) {
        secondpage.drawText("Special Qualifications:", {
            x: mapping.specialQualifications.x,
            y: mapping.specialQualifications.y + 15,
            size: mapping.specialQualifications.fontSize || 11,
            font: helveticaBoldFont,
            color: rgb(0, 0, 0)
        });

        let y = mapping.specialQualifications.y;
        const x = mapping.specialQualifications.x;
        const fontSize = mapping.specialQualifications.fontSize || 11;
        for (const sq of application.specialqualifications) {
            secondpage.drawText(sq.Description || '', { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
            y -= 15;
        }
    }

    return await templateDoc.save();
};


