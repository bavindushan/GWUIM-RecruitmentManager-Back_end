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
            universityeducations: {
                include: {
                    first_degree_subjects: true
                }
            },
            additionalinfo: true,
            physicalattributes_na: true,
            secondaryeducation: true,
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


// #################################################### Academic Section ##########################################
// drawAcademicCommonSections
async function drawAcademicCommonSections(templateDoc, page, mapping) {
    const pages = templateDoc.getPages();
    const page2 = pages[1] || templateDoc.addPage(); // still keep page2 for other content
    const page3 = pages[2] || templateDoc.addPage(); // new page for declaration + signature

    const font = await templateDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await templateDoc.embedFont(StandardFonts.HelveticaBold);

    // 1️⃣ Logo
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

    // 2️⃣ University Title
    page.drawText(
        mapping.universityTitle.text || 'Gampaha Wickramarachchi University of Indigenous Medicine, Sri Lanka',
        {
            x: mapping.universityTitle.x,
            y: mapping.universityTitle.y,
            size: mapping.universityTitle.fontSize,
            font: boldFont,
            color: rgb(0, 0, 0)
        }
    );

    // 3️⃣ Form Title
    page.drawText(mapping.formTitle.text || 'Academic Application', {
        x: mapping.formTitle.x,
        y: mapping.formTitle.y,
        size: mapping.formTitle.fontSize,
        font,
        color: rgb(0, 0, 0)
    });

    // 4️⃣ Declaration (now on page 3)
    if (mapping.declaration?.text) {
        page3.drawText(mapping.declaration.text, {
            x: mapping.declaration.textX,
            y: mapping.declaration.textY,
            size: mapping.declaration.fontSize || 10,
            font,
            color: rgb(0, 0, 0),
            maxWidth: 500,
            lineHeight: 12,
        });
    }

    // 5️⃣ Signature placeholders (now on page 3)
    page3.drawText('Date:', {
        x: mapping.signature.dateX,
        y: mapping.signature.dateY,
        size: mapping.signature.fontSize || 10,
        font,
        color: rgb(0, 0, 0)
    });

    page3.drawText('Signature:', {
        x: mapping.signature.signatureX,
        y: mapping.signature.signatureY,
        size: mapping.signature.fontSize || 10,
        font,
        color: rgb(0, 0, 0)
    });

    return { font, boldFont };
}

// drawAcademicGeneralDetails.js
async function drawAcademicGeneralDetails(page, application, mapping, font, helveticaBoldFont) {
    const fontSize = 12;
    const lineHeight = 12;
    const maxWidth = 350;
    let lastGeneralDetailY = 0;

    if (mapping.fields) {
        for (const [field, coords] of Object.entries(mapping.fields)) {
            let label = generalFieldLabels[field] || field;
            let text = '';

            // Special mappings
            if (field === 'PostApplied') {
                text = application.jobvacancy?.Title || '';
            } else if (field === 'Department-Faculty') {
                text = application.jobvacancy?.Department || '';
            } else if (field === 'Subject') {
                text = application.jobvacancy?.Description || '';
            } else if (field === 'Faculty' || field === 'Level') { // map Level to Faculty field
                text = application.jobvacancy?.Level || '';
            } else if (field === 'EthnicityOrReligion') {
                text = application.applicationgeneraldetails?.EthnicityOrReligion || '';
            } else if (field === 'AgeAtClosingDate') {
                const dob = new Date(application.applicationgeneraldetails?.DOB);
                const expiryDate = new Date(application.jobvacancy?.ExpiryDate);

                if (!isNaN(dob.getTime()) && !isNaN(expiryDate.getTime())) {
                    let age = expiryDate.getFullYear() - dob.getFullYear();
                    const monthDiff = expiryDate.getMonth() - dob.getMonth();
                    if (monthDiff < 0 || (monthDiff === 0 && expiryDate.getDate() < dob.getDate())) {
                        age--;
                    }
                    text = age.toString();
                } else {
                    text = ''; // fallback if dates are invalid
                }
            }
            // Default to general details
            else if (application.applicationgeneraldetails && application.applicationgeneraldetails[field] !== undefined) {
                text = application.applicationgeneraldetails[field];
            }
            // Fallback to user
            else if (application.user && application.user[field] !== undefined) {
                text = application.user[field];
            }

            // Format dates (exclude AgeAtClosingDate)
            if ((field.toLowerCase().includes('date') && field !== 'AgeAtClosingDate') || field.toLowerCase() === 'dob') {
                text = formatDate(text);
            }

            // Draw label
            page.drawText(`${label}:`, {
                x: coords.x,
                y: coords.y,
                size: coords.fontSize || fontSize,
                font: helveticaBoldFont,
                color: rgb(0, 0, 0)
            });

            // Draw value with wrapping
            const linesCount = drawWrappedText(
                page,
                String(text || ''),
                coords.x + 120,
                coords.y,
                maxWidth,
                font,
                fontSize,
                lineHeight
            );

            lastGeneralDetailY = Math.min(lastGeneralDetailY || coords.y, coords.y - (linesCount - 1) * lineHeight);
        }

        // Draw line after general details
        page.drawLine({
            start: { x: 40, y: lastGeneralDetailY - 10 },
            end: { x: 550, y: lastGeneralDetailY - 10 },
            thickness: 0.5,
            color: rgb(0, 0, 0),
        });
    }
}

// drawAcademicSecondaryEducation
async function drawAcademicSecondaryEducation(page, application, mapping, font, boldFont) {
    if (!mapping.tables || !mapping.tables.SecondaryEducation) return;

    const tableMapping = mapping.tables.SecondaryEducation;
    const tableData = application.secondaryeducation || []; // ✅ Use lowercase

    // Table title
    let yPos = tableMapping.startY;
    page.drawText("Secondary Education", {
        x: tableMapping.startX,
        y: yPos,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0)
    });
    yPos -= 20;

    // Column headers
    for (const [colKey, colX] of Object.entries(tableMapping.columns)) {
        page.drawText(colKey, {
            x: tableMapping.startX + colX,
            y: yPos,
            size: 12,
            font: boldFont,
            color: rgb(0, 0, 0)
        });
    }

    yPos -= tableMapping.rowHeight;

    // Row data
    tableData.forEach(row => {
        for (const [colKey, colX] of Object.entries(tableMapping.columns)) {
            let value = '';

            // Combine ExaminationPassed + PassedYear into one column
            if (colKey === 'ExamAndYear') {
                value = `${row.ExaminationPassed || ''} - ${row.PassedYear || ''}`;
            } else {
                value = row[colKey] || '';
            }

            page.drawText(String(value), {
                x: tableMapping.startX + colX,
                y: yPos,
                size: 11,
                font,
                color: rgb(0, 0, 0)
            });
        }
        yPos -= tableMapping.rowHeight;
    });

    // Draw line after table
    page.drawLine({
        start: { x: tableMapping.startX, y: yPos - 5 },
        end: { x: tableMapping.startX + 515, y: yPos - 5 },
        thickness: 0.5,
        color: rgb(0, 0, 0),
    });

    return yPos; // Return last Y for chaining other sections
}

// drawAcademicHigherEducation
async function drawAcademicHigherEducation(page, application, mapping, font, boldFont) {
    if (!mapping.tables || !mapping.tables.HigherEducation) return;

    const tableMapping = mapping.tables.HigherEducation;
    const tableData = application.universityeducations || []; // Prisma relation

    // Table title
    let yPos = tableMapping.startY;
    page.drawText("Higher Education", {
        x: tableMapping.startX,
        y: yPos,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0)
    });
    yPos -= 20;

    // Row data in two-line format
    tableData.forEach(row => {
        // Line 1: University Name
        page.drawText(String(row.Institute || ''), {
            x: tableMapping.startX,
            y: yPos,
            size: 11,
            font: boldFont,
            color: rgb(0, 0, 0)
        });
        yPos -= 14; // Adjust line spacing

        // Line 2: Degree + Year Range + Result + YearObtained + RegNo
        const resultWithYear = row.Class ? `${row.Class} (${String(row.YearObtained || '')})` : '';
        page.drawText(String(row.DegreeOrDiploma || ''), { x: tableMapping.startX + tableMapping.columns.DegreeOrDiploma, y: yPos, size: 11, font, color: rgb(0, 0, 0) });
        page.drawText(String(row.FromYear || ''), { x: tableMapping.startX + tableMapping.columns.FromYear, y: yPos, size: 11, font, color: rgb(0, 0, 0) });
        page.drawText(String(row.ToYear || ''), { x: tableMapping.startX + tableMapping.columns.ToYear, y: yPos, size: 11, font, color: rgb(0, 0, 0) });
        page.drawText(resultWithYear, { x: tableMapping.startX + tableMapping.columns.Class, y: yPos, size: 11, font, color: rgb(0, 0, 0) });
        page.drawText(String(row.IndexNumber || ''), { x: tableMapping.startX + tableMapping.columns.IndexNumber, y: yPos, size: 11, font, color: rgb(0, 0, 0) });

        yPos -= tableMapping.rowHeight; // Space after each entry
    });

    // Draw line after table
    page.drawLine({
        start: { x: tableMapping.startX, y: yPos - 5 },
        end: { x: tableMapping.startX + 515, y: yPos - 5 },
        thickness: 0.5,
        color: rgb(0, 0, 0),
    });

    return yPos; // Return last Y for chaining
}

// drawFirstDegreeSubjects
async function drawFirstDegreeSubjects(page, application, mapping, font, boldFont, startY) {
    const tableMapping = mapping?.FirstDegreeMainSubjects;

    // If mapping is missing, just use defaults
    const startX = tableMapping?.startX ?? 40;
    const rowHeight = tableMapping?.rowHeight ?? 18;
    const subjectColumn = tableMapping?.columns?.Subject ?? 0;

    let yPos = startY ?? tableMapping?.startY ?? 770;

    page.drawText("First Degree Main Subjects", {
        x: startX,
        y: yPos,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0)
    });
    yPos -= 18;

    // Collect subjects
    const subjects = [];
    application.universityeducations?.forEach(uni => {
        uni.first_degree_subjects?.forEach(sub => {
            if (sub.MainSubject) subjects.push(sub.MainSubject);
        });
    });

    // Draw two per line
    for (let i = 0; i < subjects.length; i += 2) {
        const leftSubject = subjects[i] || '';
        const rightSubject = subjects[i + 1] || '';

        page.drawText(leftSubject, {
            x: startX + subjectColumn,
            y: yPos,
            size: 11,
            font,
            color: rgb(0, 0, 0)
        });

        if (rightSubject) {
            page.drawText(rightSubject, {
                x: startX + subjectColumn + 200,
                y: yPos,
                size: 11,
                font,
                color: rgb(0, 0, 0)
            });
        }

        yPos -= rowHeight;
    }

    // Draw line after table
    page.drawLine({
        start: { x: startX, y: yPos - 5 },
        end: { x: startX + 515, y: yPos - 5 },
        thickness: 0.5,
        color: rgb(0, 0, 0),
    });

    return yPos;
}

// drawProfessionalQualifications
async function drawProfessionalQualifications(page, application, mapping, font, boldFont, startY) {
    const tableMapping = mapping?.ProfessionalQualifications || {};

    // Defaults if mapping missing
    const startX = tableMapping?.startX ?? 50;
    const rowHeight = tableMapping?.rowHeight ?? 18;
    const columns = tableMapping?.columns || { Institution: 0, Qualification: 200, Year: 350 };
    let yPos = startY ?? tableMapping?.startY ?? 800;

    // Section title
    page.drawText("Professional Qualifications", {
        x: startX,
        y: yPos,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0)
    });
    yPos -= 18;

    // Iterate through professional qualifications
    application.professionalqualifications?.forEach(pq => {
        // Line 1: Institution
        if (pq.Institution) {
            page.drawText(pq.Institution, {
                x: startX + columns.Institution,
                y: yPos,
                size: 11,
                font: boldFont,
                color: rgb(0, 0, 0)
            });
            yPos -= rowHeight;
        }

        // Line 2: Qualification, FromYear–ToYear, ResultOrExamPassed
        const yearText = `${pq.FromYear || ''}-${pq.ToYear || ''}`;
        page.drawText(pq.QualificationName || '', {
            x: startX,
            y: yPos,
            size: 11,
            font,
            color: rgb(0, 0, 0)
        });
        page.drawText(yearText, {
            x: startX + columns.Year,
            y: yPos,
            size: 11,
            font,
            color: rgb(0, 0, 0)
        });
        page.drawText(pq.ResultOrExamPassed || '', {
            x: startX + columns.Year + 80,
            y: yPos,
            size: 11,
            font,
            color: rgb(0, 0, 0)
        });

        yPos -= rowHeight;

    });

    // Optional line
    page.drawLine({
        start: { x: startX, y: yPos + 5 },
        end: { x: startX + 515, y: yPos + 5 },
        thickness: 0.5,
        color: rgb(0, 0, 0),
    });

    return yPos;
}

// drawSpecialQualifications
async function drawSpecialQualifications(page, applicationID, prisma, mapping, font, boldFont) {
    const { x, y, fontSize } = mapping.specialQualifications;

    // Fetch Special Qualifications from DB
    const specialQualifications = await prisma.specialqualifications.findMany({
        where: { ApplicationID: applicationID },
        select: { Description: true }
    });

    let currentY = y;

    // Section title
    page.drawText("Special Qualifications", {
        x,
        y: currentY,  // use currentY for consistency
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0)
    });

    currentY -= 18; // space after title

    // Draw each Special Qualification description line by line
    for (const sq of specialQualifications) {
        if (sq.Description && sq.Description.trim() !== "") {
            page.drawText(sq.Description, {
                x,
                y: currentY,
                size: fontSize,
                font,
                color: rgb(0, 0, 0)
            });
            currentY -= 20; // move down for next line
        }
    }
    // Optional line
    page.drawLine({
        start: { x: x, y: currentY + 5 },
        end: { x: x + 515, y: currentY + 5 },
        thickness: 0.5,
        color: rgb(0, 0, 0),
    });
    return currentY; // return final position if needed by next section
}

// drawLanguagesProficiency
async function drawLanguagesProficiency(page, applicationID, prisma, mapping, font, boldFont) {
    if (!mapping?.tables?.languagesProficiency) return;

    const { x, y, fontSize } = mapping.tables.languagesProficiency;

    // Fetch data from DB using correct field names
    const languages = await prisma.languageproficiencies.findMany({
        where: { ApplicationID: applicationID },
        select: { Language: true, CanSpeak: true, CanRead: true, CanWrite: true, CanTeach: true }
    });

    let currentY = y;

    // Section title
    const titleFontSize = 12;
    page.drawText("Languages Proficiency", {
        x,
        y: currentY,
        size: titleFontSize,
        font: boldFont,
        color: rgb(0, 0, 0)
    });

    // Leave space below title before headers
    currentY -= titleFontSize + 8;  // 8px padding

    // Table headers
    const headers = ["Language", "Ability to Work", "Ability to Read", "Ability to Write", "Ability to Teach"];
    const colWidths = [100, 120, 120, 120, 120]; // Adjust as needed
    const rowHeight = 20;

    // Draw header row
    let currentX = x;
    for (let i = 0; i < headers.length; i++) {
        page.drawText(headers[i], { x: currentX + 5, y: currentY, size: fontSize, font: boldFont });
        currentX += colWidths[i];
    }
    currentY -= rowHeight;

    const valueMap = { Very_Good: "Very Good", Good: "Good", Fair: "Fair", None: "None" };

    // Draw each language row
    for (const lang of languages) {
        currentX = x;
        const rowData = [
            lang.Language || "",
            valueMap[lang.CanSpeak] || "None",
            valueMap[lang.CanRead] || "None",
            valueMap[lang.CanWrite] || "None",
            valueMap[lang.CanTeach] || "None"
        ];

        for (let i = 0; i < rowData.length; i++) {
            page.drawText(rowData[i], { x: currentX + 5, y: currentY, size: fontSize, font });
            currentX += colWidths[i];
        }

        currentY -= rowHeight;
    }

    // Optional line below table
    page.drawLine({
        start: { x: x, y: currentY + 5 },
        end: { x: x + 515, y: currentY + 5 },
        thickness: 0.5,
        color: rgb(0, 0, 0),
    });

    return currentY;
}

// drawEmployeeRecords
async function drawEmployeeRecords(page, applicationID, prisma, font, boldFont, mapping) {
    // console.log("drawEmployeeRecords method working!!");
    // console.log("ApplicationID passed to drawEmployeeRecords:", applicationID);

    // Fetch employment records for the given applicationID
    const records = await prisma.employmenthistories.findMany({
        where: { ApplicationID: Number(applicationID) },
        select: {
            PostHeld: true,
            Institution: true,
            FromDate: true,
            ToDate: true,
            LastSalary: true
        }
    });

    //console.log("Employment Records fetched:", records);

    if (!records || records.length === 0) {
        console.log("No employment records found for this application.");
        return;
    }

    // --- Table layout ---
    const startX = mapping?.EmploymentRecords?.startX ?? 50; // fallback
    let currentY = mapping?.EmploymentRecords?.startY ?? 800; // starting Y coordinate
    const rowHeight = mapping?.EmploymentRecords?.rowHeight ?? 18;

    // Column positions relative to startX
    const colPositions = mapping?.EmploymentRecords?.columns
        ? [
            mapping.EmploymentRecords.columns.PostHeld,
            mapping.EmploymentRecords.columns.Institution,
            mapping.EmploymentRecords.columns.FromDate,
            mapping.EmploymentRecords.columns.ToDate,
            mapping.EmploymentRecords.columns.LastSalary
        ]
        : [0, 150, 350, 410, 480]; // default positions

    const headers = ["Post Held", "Institution", "From Date", "To Date", "Last Salary"];

    // Section title
    page.drawText("Employment Records", {
        x: startX,
        y: currentY,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0)
    });

    currentY -= rowHeight;

    // Draw table headers
    for (let i = 0; i < headers.length; i++) {
        page.drawText(headers[i], {
            x: startX + colPositions[i],
            y: currentY,
            size: 11,
            font: boldFont,
            color: rgb(0, 0, 0)
        });
    }

    currentY -= rowHeight;

    // Helper functions
    const formatDate = (date) => (date ? new Date(date).toLocaleDateString() : "");
    const formatSalary = (salary) => (salary != null ? salary.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "");

    // Draw each record row
    for (const rec of records) {
        const rowData = [
            rec.PostHeld || "",
            rec.Institution || "",
            formatDate(rec.FromDate),
            formatDate(rec.ToDate),
            formatSalary(rec.LastSalary)
        ];

        for (let i = 0; i < rowData.length; i++) {
            page.drawText(rowData[i], {
                x: startX + colPositions[i],
                y: currentY,
                size: 11,
                font,
                color: rgb(0, 0, 0)
            });
        }

        currentY -= rowHeight;
    }

    // Optional horizontal line below table
    page.drawLine({
        start: { x: startX, y: currentY + 5 },
        end: { x: startX + 550, y: currentY + 5 },
        thickness: 0.5,
        color: rgb(0, 0, 0),
    });

    return currentY;
}

// drawExperienceDescription
async function drawExperienceDescription(page, applicationID, prisma, mapping, font, boldFont) {
    if (!mapping?.experienceDescription) return;

    const { x, y, fontSize, maxWidth, lineHeight } = mapping.experienceDescription;

    // Fetch experience details from DB
    const experience = await prisma.experiencedetails.findMany({
        where: { ApplicationID: applicationID },
        select: { Description: true }
    });

    if (!experience || experience.length === 0) {
        console.log("No experience details found for this application.");
        return y;
    }

    let currentY = y;

    // Section title
    const titleFontSize = fontSize || 12;
    page.drawText("Experience Description", {
        x,
        y: currentY,
        size: titleFontSize,
        font: boldFont,
        color: rgb(0, 0, 0)
    });

    currentY -= titleFontSize + 8; // padding below title

    // Draw each experience description
    for (const exp of experience) {
        if (exp.Description) {
            // Split text into lines if maxWidth is provided
            const textLines = exp.Description.match(/(.|[\r\n]){1,100}/g) || [exp.Description];
            for (const line of textLines) {
                page.drawText(line, {
                    x,
                    y: currentY,
                    size: fontSize || 10,
                    font,
                    color: rgb(0, 0, 0),
                    maxWidth: maxWidth || 500,
                    lineHeight: lineHeight || 12
                });
                currentY -= lineHeight || 12;
            }
            currentY -= 8; // spacing between experiences if multiple
        }
    }

    // Optional horizontal line below table
    page.drawLine({
        start: { x: x, y: currentY + 5 },
        end: { x: x + 550, y: currentY + 5 },
        thickness: 0.5,
        color: rgb(0, 0, 0),
    });

    return currentY;
}

// generateAcademicApplicationPDF
exports.generateAcademicApplicationPDF = async (applicationID) => {

    // 1️⃣ Fetch application data
    const application = await fetchApplicationData(applicationID);

    // 2️⃣ Load academic template and mapping
    const { pdfDoc: templateDoc, mapping } = await loadTemplateAndMapping('Academic');

    // 3️⃣ Get pages
    const pages = templateDoc.getPages();
    const page1 = pages[0];
    const page2 = pages[1] || templateDoc.addPage();
    const page3 = pages[2] || templateDoc.addPage(); // ✅ New page 3

    // 4️⃣ Draw common sections (logo, titles) only on page1
    const { font, boldFont } = await drawAcademicCommonSections(templateDoc, page1, mapping);

    // 5️⃣ Draw top-right identifiers on page1
    let topRightY = mapping.applicationNo.y;
    const identifiers = [
        { label: 'Application ID', value: application.ApplicationID },
        { label: 'Job ID', value: application.jobvacancy?.JobID || '' },
        { label: 'Closing Date', value: formatDate(application.jobvacancy?.ExpiryDate || '') }
    ];
    for (const item of identifiers) {
        page1.drawText(`${item.label}:`, {
            x: mapping.applicationNo.x,
            y: topRightY,
            size: mapping.applicationNo.fontSize || 10,
            font: boldFont,
            color: rgb(0, 0, 0)
        });
        page1.drawText(`${item.value}`, {
            x: mapping.applicationNo.x + 90,
            y: topRightY,
            size: mapping.applicationNo.fontSize || 10,
            font,
            color: rgb(0, 0, 0)
        });
        topRightY -= 14;
    }

    // 🔹 Draw General Details (Personal Info Section) on page1
    await drawAcademicGeneralDetails(page1, application, mapping, font, boldFont);

    // 6️⃣ Draw main academic fields on page1
    for (const [fieldKey, coords] of Object.entries(mapping.fields)) {
        if (application[fieldKey] !== undefined && application[fieldKey] !== null) {
            page1.drawText(String(application[fieldKey]), {
                x: coords.x,
                y: coords.y,
                size: coords.fontSize || 10,
                font,
                color: rgb(0, 0, 0)
            });
        }
    }

    // 7️⃣ Draw Secondary Education Table on page1
    await drawAcademicSecondaryEducation(page1, application, mapping, font, boldFont);

    // 8️⃣ Draw Higher Education Table on page1
    let currentY = await drawAcademicHigherEducation(page1, application, mapping, font, boldFont);

    // 9️⃣ Draw First Degree Subjects on page2
    currentY = await drawFirstDegreeSubjects(
        page1,
        application,
        mapping,
        font,
        boldFont,
        mapping?.FirstDegreeMainSubjects?.startY ?? 200
    );

    // 🔟 Draw Professional Qualifications on page2
    currentY = await drawProfessionalQualifications(
        page2,
        application,
        mapping,
        font,
        boldFont,
        mapping?.ProfessionalQualifications?.startY ?? 810
    );

    // 1️⃣1️⃣ Draw Special Qualifications on page2
    currentY = await drawSpecialQualifications(page2, applicationID, prisma, mapping, font, boldFont);

    // 1️⃣2️⃣ Draw Languages Proficiency on page2
    currentY = await drawLanguagesProficiency(page2, applicationID, prisma, mapping, font, boldFont);

    // 1️⃣4️⃣ Draw Employment Records table on page3
    currentY = await drawEmployeeRecords(page3, applicationID, prisma, font, boldFont, mapping);

    // 1️⃣3️⃣ Draw Experience Description on page2
    currentY = await drawExperienceDescription(page3, applicationID, prisma, mapping, font, boldFont);



    // 1️⃣5️⃣ Draw remaining text areas on page2
    const textAreas = [
        'experienceDescription',
        'researchPublications',
        'specialQualifications',
        'nonRelatedReferees',
        'additionalInfo'
    ];
    textAreas.forEach(areaKey => {
        if (application[areaKey]) {
            const coords = mapping[areaKey];
            page2.drawText(String(application[areaKey]), {
                x: coords.x,
                y: coords.y,
                size: coords.fontSize || 10,
                font,
                color: rgb(0, 0, 0),
                maxWidth: 500,
                lineHeight: 12
            });
        }
    });

    // 1️⃣6️⃣ Return PDF bytes
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
        return await exports.generateAcademicApplicationPDF(applicationID);
    } else {
        return await generateNonAcademicApplicationPDF(applicationID, application);
    }
};




