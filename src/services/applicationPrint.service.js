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


//#################################################### PDf Print Section ####################################################

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

// ==================== PAGE 1: General Details + Tables ====================
async function drawGeneralAndTables(
    page,
    application,
    mapping,
    helveticaFont,
    helveticaBoldFont,
    font,
    generalFieldLabels,
    drawWrappedText,
    drawTable,
    formatDate
) {
    // === General Details ===
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

    // === GCE O/L Table ===
    if (mapping.tables.GCE_OL && application.gce_ol_results?.length) {
        const yStart = mapping.tables.GCE_OL.startY;
        const rowHeight = mapping.tables.GCE_OL.rowHeight || 15;
        const fontSize = mapping.tables.GCE_OL.fontSize || 12;

        page.drawText("GCE O/L Results", {
            x: mapping.tables.GCE_OL.startX,
            y: yStart + 20,
            size: 12,
            font: helveticaBoldFont,
            color: rgb(0, 0, 0)
        });

        for (let i = 0; i < application.gce_ol_results.length; i++) {
            const row = application.gce_ol_results[i];
            const y = yStart - i * rowHeight;

            page.drawText(row.Subject || '', { x: mapping.tables.GCE_OL.startX + (mapping.tables.GCE_OL.columns.Subject || 0), y, size: fontSize, font, color: rgb(0, 0, 0) });
            page.drawText(row.Grade || '', { x: mapping.tables.GCE_OL.startX + (mapping.tables.GCE_OL.columns.Grade || 170), y, size: fontSize, font, color: rgb(0, 0, 0) });
            page.drawText(row.ExamYear != null ? row.ExamYear.toString() : '', { x: mapping.tables.GCE_OL.startX + (mapping.tables.GCE_OL.columns.ExamYear || 300), y, size: fontSize, font, color: rgb(0, 0, 0) });
        }

        page.drawLine({
            start: { x: 40, y: yStart - (application.gce_ol_results.length * rowHeight) - 1 },
            end: { x: 550, y: yStart - (application.gce_ol_results.length * rowHeight) - 1 },
            thickness: 0.5,
            color: rgb(0, 0, 0),
        });
    }

    // === GCE A/L Table ===
    if (mapping.tables.GCE_AL && application.gce_al_results?.length) {
        const yStart = mapping.tables.GCE_AL.startY;
        const rowHeight = mapping.tables.GCE_AL.rowHeight || 15;
        const fontSize = mapping.tables.GCE_AL.fontSize || 12;

        page.drawText("GCE A/L Results", {
            x: mapping.tables.GCE_AL.startX,
            y: yStart + 20,
            size: 12,
            font: helveticaBoldFont,
            color: rgb(0, 0, 0)
        });

        for (let i = 0; i < application.gce_al_results.length; i++) {
            const row = application.gce_al_results[i];
            const y = yStart - i * rowHeight;

            page.drawText(row.Subject || '', { x: mapping.tables.GCE_AL.startX + (mapping.tables.GCE_AL.columns.Subject || 0), y, size: fontSize, font, color: rgb(0, 0, 0) });
            page.drawText(row.Grade || '', { x: mapping.tables.GCE_AL.startX + (mapping.tables.GCE_AL.columns.Grade || 170), y, size: fontSize, font, color: rgb(0, 0, 0) });
            page.drawText(row.ExamYear != null ? row.ExamYear.toString() : '', { x: mapping.tables.GCE_AL.startX + (mapping.tables.GCE_AL.columns.ExamYear || 300), y, size: fontSize, font, color: rgb(0, 0, 0) });
        }

        page.drawLine({
            start: { x: 40, y: yStart - (application.gce_al_results.length * rowHeight) - 10 },
            end: { x: 550, y: yStart - (application.gce_al_results.length * rowHeight) - 10 },
            thickness: 0.5,
            color: rgb(0, 0, 0),
        });
    }
}

// ==================== PAGE 2: University, Professional, Language, Employment, Experience ====================
async function drawSecondPageSections(
    secondPage,
    application,
    mapping,
    helveticaFont,
    helveticaBoldFont,
    font,
    drawTable
) {
    let currentPage = secondPage;

    // Helper to draw a horizontal line
    const drawSectionLine = (y) => {
        currentPage.drawLine({
            start: { x: 40, y },
            end: { x: 550, y },
            thickness: 0.5,
            color: rgb(0, 0, 0)
        });
    };

    // University Education
    if (mapping.tables.UniversityEducation && application.universityeducations?.length) {
        let y = mapping.tables.UniversityEducation.startY;
        const lineHeight = 18;
        const fontSize = mapping.tables.UniversityEducation.fontSize || 10;

        currentPage.drawText("University Education", { x: mapping.tables.UniversityEducation.startX, y: y + 20, size: 12, font: helveticaBoldFont, color: rgb(0, 0, 0) });

        for (const edu of application.universityeducations) {
            currentPage.drawText(`${edu.Institute}`, { x: mapping.tables.UniversityEducation.startX, y, size: fontSize, font: helveticaBoldFont, color: rgb(0, 0, 0) });
            y -= lineHeight;
            currentPage.drawText(`${edu.DegreeOrDiploma}`, { x: mapping.tables.UniversityEducation.startX, y, size: fontSize, font, color: rgb(0, 0, 0) });
            currentPage.drawText(`${edu.FromYear} – ${edu.ToYear}`, { x: mapping.tables.UniversityEducation.startX + 210, y, size: fontSize, font, color: rgb(0, 0, 0) });
            currentPage.drawText(`${edu.Class} (${edu.YearObtained})`, { x: mapping.tables.UniversityEducation.startX + 290, y, size: fontSize, font, color: rgb(0, 0, 0) });
            currentPage.drawText(`${edu.IndexNumber}`, { x: mapping.tables.UniversityEducation.startX + 440, y, size: fontSize, font, color: rgb(0, 0, 0) });
            y -= lineHeight + 5;
        }

        drawSectionLine(y);
    }

    // Professional Qualifications
    if (mapping.tables.ProfessionalQualifications && application.professionalqualifications?.length) {
        let y = mapping.tables.ProfessionalQualifications.startY;
        const lineHeight = 18;
        const fontSize = mapping.tables.ProfessionalQualifications.fontSize || 10;

        currentPage.drawText("Professional Qualifications", { x: mapping.tables.ProfessionalQualifications.startX, y: y + 20, size: 12, font: helveticaBoldFont, color: rgb(0, 0, 0) });

        for (const pq of application.professionalqualifications) {
            currentPage.drawText(`${pq.Institution}`, { x: mapping.tables.ProfessionalQualifications.startX, y, size: fontSize, font: helveticaBoldFont, color: rgb(0, 0, 0) });
            y -= lineHeight;
            currentPage.drawText(`${pq.QualificationName}`, { x: mapping.tables.ProfessionalQualifications.startX, y, size: fontSize, font, color: rgb(0, 0, 0) });
            currentPage.drawText(`${pq.FromYear} – ${pq.ToYear}`, { x: mapping.tables.ProfessionalQualifications.startX + 280, y, size: fontSize, font, color: rgb(0, 0, 0) });
            currentPage.drawText(`${pq.ResultOrExamPassed}`, { x: mapping.tables.ProfessionalQualifications.startX + 370, y, size: fontSize, font, color: rgb(0, 0, 0) });
            y -= lineHeight + 5;
        }

        drawSectionLine(y);
    }

    // Language Proficiency
    if (mapping.tables.LanguageProficiency && application.languageproficiencies?.length) {
        const startY = mapping.tables.LanguageProficiency.startY;
        currentPage.drawText("Language Proficiency", { x: mapping.tables.LanguageProficiency.startX, y: startY + 20, size: 12, font: helveticaBoldFont, color: rgb(0, 0, 0) });
        const lastY = drawTable(currentPage, application.languageproficiencies, mapping.tables.LanguageProficiency, font);
        drawSectionLine(lastY - 5);
    }

    // Employment Histories
    if (mapping.tables.EmployeeRecords && application.employmenthistories?.length) {
        const startY = mapping.tables.EmployeeRecords.startY;
        currentPage.drawText("Employment Histories", { x: mapping.tables.EmployeeRecords.startX, y: startY + 20, size: 12, font: helveticaBoldFont, color: rgb(0, 0, 0) });
        const lastY = drawTable(currentPage, application.employmenthistories, mapping.tables.EmployeeRecords, font);
        drawSectionLine(lastY - 5);
    }

    // Experience Details
    if (application.experiencedetails && mapping.experience) {
        let y = mapping.experience.y;
        const x = mapping.experience.x;
        const fontSize = mapping.experience.fontSize || 11;
        currentPage.drawText("Experience Details", { x, y: y + 15, size: fontSize, font: helveticaBoldFont, color: rgb(0, 0, 0) });
        for (const exp of application.experiencedetails) {
            currentPage.drawText(exp.Description || '', { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
            y -= 15;
        }
        drawSectionLine(y);
    }

    // Special Qualifications
    if (application.specialqualifications && mapping.specialQualifications) {
        let y = mapping.specialQualifications.y;
        const x = mapping.specialQualifications.x;
        const fontSize = mapping.specialQualifications.fontSize || 11;
        currentPage.drawText("Special Qualifications / Extra-curricular Activities", { x, y: y + 15, size: fontSize, font: helveticaBoldFont, color: rgb(0, 0, 0) });
        for (const sq of application.specialqualifications) {
            currentPage.drawText(sq.Description || '', { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
            y -= 15;
        }
        drawSectionLine(y);
    }
}

// generateNonAcademicApplicationPDF
async function generateNonAcademicApplicationPDF(applicationID, applicationData) {
    const application = applicationData || await fetchApplicationData(applicationID);

    const { pdfDoc: templateDoc, mapping } = await loadTemplateAndMapping('Non_Academic');

    const helveticaFont = await templateDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await templateDoc.embedFont(StandardFonts.HelveticaBold);

    const page = templateDoc.getPages()[0];
    const secondPage = templateDoc.getPages()[1];

    await drawCommonSections(templateDoc, page, mapping, helveticaFont, helveticaBoldFont);
    await drawGeneralAndTables(page, application, mapping, helveticaFont, helveticaBoldFont, helveticaFont, generalFieldLabels, drawWrappedText, drawTable, formatDate);
    await drawSecondPageSections(secondPage, application, mapping, helveticaFont, helveticaBoldFont, helveticaFont, drawTable);

    const topRightX = 400;
    let topRightY = 810;
    const identifiers = [
        { label: "Application ID", value: application.ApplicationID },
        { label: "Job ID", value: application.jobvacancy?.JobID || '' },
        { label: "Expiry Date", value: formatDate(application.jobvacancy?.ExpiryDate || '') }
    ];

    const fontSize = 12;
    for (const item of identifiers) {
        page.drawText(`${item.label}:`, {
            x: topRightX,
            y: topRightY,
            size: fontSize,
            font: helveticaBoldFont,
            color: rgb(0, 0, 0)
        });
        page.drawText(`${item.value}`, {
            x: topRightX + 90,
            y: topRightY,
            size: fontSize,
            font: helveticaFont,
            color: rgb(0, 0, 0)
        });
        topRightY -= 14;
    }

    return await templateDoc.save();
}

// generateAcademicApplicationPDF
exports.generateAcademicApplicationPDF = async (applicationID) => {
    // 1️⃣ Fetch application data
    const application = await fetchApplicationData(applicationID);

    // 2️⃣ Load academic template and mapping
    const { pdfDoc: templateDoc, mapping } = await loadTemplateAndMapping('Academic');

    // 3️⃣ Embed fonts
    const helveticaFont = await templateDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await templateDoc.embedFont(StandardFonts.HelveticaBold);

    // 4️⃣ Get pages
    const page = templateDoc.getPages()[0];
    const secondPage = templateDoc.getPages()[1];

    // 5️⃣ Draw header: logo, university name, form title
    if (mapping.logo) {
        // Example: draw logo if required (optional)
        // const logoBytes = fs.readFileSync('path/to/logo.png');
        // const pngImage = await templateDoc.embedPng(logoBytes);
        // page.drawImage(pngImage, { x: mapping.logo.x, y: mapping.logo.y, width: mapping.logo.width, height: mapping.logo.height });
    }

    page.drawText('Gampaha Wickramarachchi University of Indigenous Medicine, Sri Lanka', {
        x: mapping.universityTitle.x,
        y: mapping.universityTitle.y,
        size: mapping.universityTitle.fontSize,
        font: helveticaBoldFont,
        color: rgb(0, 0, 0)
    });

    page.drawText('Academic Application', {
        x: mapping.formTitle.x,
        y: mapping.formTitle.y,
        size: mapping.formTitle.fontSize,
        font: helveticaBoldFont,
        color: rgb(0, 0, 0)
    });

    // 6️⃣ Draw top-right identifiers
    const topRightX = mapping.applicationNo.x;
    let topRightY = mapping.applicationNo.y;
    const identifiers = [
        { label: 'Application ID', value: application.ApplicationID },
        { label: 'Job ID', value: application.jobvacancy?.JobID || '' },
        { label: 'Expiry Date', value: formatDate(application.jobvacancy?.ExpiryDate || '') }
    ];
    for (const item of identifiers) {
        page.drawText(`${item.label}:`, { x: topRightX, y: topRightY, size: 10, font: helveticaBoldFont, color: rgb(0, 0, 0) });
        page.drawText(`${item.value}`, { x: topRightX + 90, y: topRightY, size: 10, font: helveticaFont, color: rgb(0, 0, 0) });
        topRightY -= 14;
    }

    // 7️⃣ TODO: Draw main fields (PostApplied, Subject, Department, etc.)
    // 8️⃣ TODO: Draw tables
    // 9️⃣ TODO: Draw remaining sections and declaration

    // 10️⃣ Return PDF bytes
    return await templateDoc.save();
};

// Main function to generate PDF
exports.generateApplicationPDF = async (applicationID) => {
    // 1️⃣ Fetch application data
    const application = await fetchApplicationData(applicationID);

    // 2️⃣ Determine type
    const applicationType = application.jobvacancy?.applicationtemplate?.Type || 'Non_Academic';

    // 3️⃣ Route to the correct generator
    if (applicationType === 'Academic') {
        return await generateAcademicApplicationPDF(applicationID);
    } else {
        return await generateNonAcademicApplicationPDF(applicationID, application);
    }
};




