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

    // === Top-right identifiers on page 1 ===
    const topRightX = 400; // adjust X for right corner
    let topRightY = 810;   // adjust Y for top

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
            x: topRightX + 90, // space after label
            y: topRightY,
            size: fontSize,
            font: helveticaFont,
            color: rgb(0, 0, 0)
        });

        topRightY -= 14; // move down for next line
    }


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

            const yStart = mapping.tables.GCE_OL.startY;
            const rowHeight = mapping.tables.GCE_OL.rowHeight || 15;
            const fontSize = mapping.tables.GCE_OL.fontSize || 12;

            for (let i = 0; i < application.gce_ol_results.length; i++) {
                const row = application.gce_ol_results[i];
                const y = yStart - i * rowHeight;

                // Subject
                page.drawText(row.Subject || '', {
                    x: mapping.tables.GCE_OL.startX + (mapping.tables.GCE_OL.columns.Subject || 0),
                    y,
                    size: fontSize,
                    font,
                    color: rgb(0, 0, 0)
                });

                // Grade
                page.drawText(row.Grade || '', {
                    x: mapping.tables.GCE_OL.startX + (mapping.tables.GCE_OL.columns.Grade || 170),
                    y,
                    size: fontSize,
                    font,
                    color: rgb(0, 0, 0)
                });

                // Exam Year — just use the number as string
                page.drawText(row.ExamYear != null ? row.ExamYear.toString() : '', {
                    x: mapping.tables.GCE_OL.startX + (mapping.tables.GCE_OL.columns.ExamYear || 300),
                    y,
                    size: fontSize,
                    font,
                    color: rgb(0, 0, 0)
                });
            }

            // Draw dividing line
            const lineY = yStart - (application.gce_ol_results.length * rowHeight) - 1;
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

            const yStart = mapping.tables.GCE_AL.startY;
            const rowHeight = mapping.tables.GCE_AL.rowHeight || 15;
            const fontSize = mapping.tables.GCE_AL.fontSize || 12;

            for (let i = 0; i < application.gce_al_results.length; i++) {
                const row = application.gce_al_results[i];
                const y = yStart - i * rowHeight;

                // Subject
                page.drawText(row.Subject || '', {
                    x: mapping.tables.GCE_AL.startX + (mapping.tables.GCE_AL.columns.Subject || 0),
                    y,
                    size: fontSize,
                    font,
                    color: rgb(0, 0, 0)
                });

                // Grade
                page.drawText(row.Grade || '', {
                    x: mapping.tables.GCE_AL.startX + (mapping.tables.GCE_AL.columns.Grade || 170),
                    y,
                    size: fontSize,
                    font,
                    color: rgb(0, 0, 0)
                });

                // Exam Year — print number as string
                page.drawText(row.ExamYear != null ? row.ExamYear.toString() : '', {
                    x: mapping.tables.GCE_AL.startX + (mapping.tables.GCE_AL.columns.ExamYear || 300),
                    y,
                    size: fontSize,
                    font,
                    color: rgb(0, 0, 0)
                });
            }

            // Draw dividing line
            const lineY = yStart - (application.gce_al_results.length * rowHeight) - 10;
            page.drawLine({
                start: { x: 40, y: lineY },
                end: { x: 550, y: lineY },
                thickness: 0.5,
                color: rgb(0, 0, 0),
            });
        }

        // ====== SECOND PAGE ======
        let currentPage = secondpage;

        // University Education
        if (mapping.tables.UniversityEducation && application.universityeducations?.length) {
            currentPage.drawText("University Education", {
                x: mapping.tables.UniversityEducation.startX,
                y: mapping.tables.UniversityEducation.startY + 20,
                size: 12,
                font: helveticaBoldFont,
                color: rgb(0, 0, 0)
            });

            let y = mapping.tables.UniversityEducation.startY;
            const lineHeight = 18;
            const fontSize = mapping.tables.UniversityEducation.fontSize || 10;

            for (const edu of application.universityeducations) {
                // University name (full width line)
                currentPage.drawText(`${edu.Institute}`, {
                    x: mapping.tables.UniversityEducation.startX,
                    y,
                    size: fontSize,
                    font: helveticaBoldFont,
                    color: rgb(0, 0, 0)
                });
                y -= lineHeight;

                // Degree, Period, Class/Grade, IndexNumber in one line
                const degreeText = `${edu.DegreeOrDiploma}`;
                const periodText = `${edu.FromYear} – ${edu.ToYear}`;
                const classText = `${edu.Class} (${edu.YearObtained})`;
                const indexText = `${edu.IndexNumber}`;

                currentPage.drawText(degreeText, {
                    x: mapping.tables.UniversityEducation.startX,
                    y,
                    size: fontSize,
                    font,
                    color: rgb(0, 0, 0)
                });
                currentPage.drawText(periodText, {
                    x: mapping.tables.UniversityEducation.startX + 210,
                    y,
                    size: fontSize,
                    font,
                    color: rgb(0, 0, 0)
                });
                currentPage.drawText(classText, {
                    x: mapping.tables.UniversityEducation.startX + 290,
                    y,
                    size: fontSize,
                    font,
                    color: rgb(0, 0, 0)
                });
                currentPage.drawText(indexText, {
                    x: mapping.tables.UniversityEducation.startX + 440,
                    y,
                    size: fontSize,
                    font,
                    color: rgb(0, 0, 0)
                });

                y -= lineHeight + 5; // space before next university
            }

            // Draw dividing line at the end
            currentPage.drawLine({
                start: { x: 40, y: y },
                end: { x: 550, y: y },
                thickness: 0.5,
                color: rgb(0, 0, 0),
            });
        }

        // Professional Qualifications
        if (mapping.tables.ProfessionalQualifications && application.professionalqualifications?.length) {
            currentPage.drawText("Professional Qualifications", {
                x: mapping.tables.ProfessionalQualifications.startX,
                y: mapping.tables.ProfessionalQualifications.startY + 20,
                size: 12,
                font: helveticaBoldFont,
                color: rgb(0, 0, 0)
            });

            let y = mapping.tables.ProfessionalQualifications.startY;
            const lineHeight = 18;
            const fontSize = mapping.tables.ProfessionalQualifications.fontSize || 10;

            for (const pq of application.professionalqualifications) {
                // Institution name (first row)
                currentPage.drawText(`${pq.Institution}`, {
                    x: mapping.tables.ProfessionalQualifications.startX,
                    y,
                    size: fontSize,
                    font: helveticaBoldFont,
                    color: rgb(0, 0, 0)
                });
                y -= lineHeight;

                // QualificationName, Period, ResultOrExamPassed (second row)
                const qualificationText = `${pq.QualificationName}`;
                const periodText = `${pq.FromYear} – ${pq.ToYear}`;
                const resultText = `${pq.ResultOrExamPassed}`;

                currentPage.drawText(qualificationText, {
                    x: mapping.tables.ProfessionalQualifications.startX,
                    y,
                    size: fontSize,
                    font,
                    color: rgb(0, 0, 0)
                });
                currentPage.drawText(periodText, {
                    x: mapping.tables.ProfessionalQualifications.startX + 200,
                    y,
                    size: fontSize,
                    font,
                    color: rgb(0, 0, 0)
                });
                currentPage.drawText(resultText, {
                    x: mapping.tables.ProfessionalQualifications.startX + 320,
                    y,
                    size: fontSize,
                    font,
                    color: rgb(0, 0, 0)
                });

                y -= lineHeight + 5; // space before next qualification
            }

            // Draw dividing line at the end
            currentPage.drawLine({
                start: { x: 40, y: y },
                end: { x: 550, y: y },
                thickness: 0.5,
                color: rgb(0, 0, 0),
            });
        }

        //Language Proficiency

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

        //Employment Histories

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
        secondpage.drawText("Experience Details", {
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

        secondpage.drawLine({
            start: { x: 40, y: y - 5 },
            end: { x: 550, y: y - 5 },
            thickness: 0.5,
            color: rgb(0, 0, 0),
        });
    }

    // === Special qualifications ===
    if (application.specialqualifications && mapping.specialQualifications) {
        secondpage.drawText("Special Qualifications / Extra-curricular Activities ", {
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

        secondpage.drawLine({
            start: { x: 40, y: y - 5 },
            end: { x: 550, y: y - 5 },
            thickness: 0.5,
            color: rgb(0, 0, 0),
        });
    }

    return await templateDoc.save();
};


