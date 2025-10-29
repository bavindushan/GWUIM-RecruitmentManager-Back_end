// applicationPrint.service.js
// Full jsPDF-based PDF generator for Academic & Non-Academic applications

const { jsPDF } = require('jspdf');      // Must destructure jsPDF
require('jspdf-autotable');              // attach autoTable to jsPDF prototype
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { NotFoundError, BadRequestError } = require('../utils/AppError');
const { drawButton } = require('pdf-lib');
const { applyPlugin } = require('jspdf-autotable');


/**
 * Draw a horizontal line after a section
 * @param {jsPDF} doc - The jsPDF instance
 * @param {string} type - 'general' or 'academic' to determine Y position
 * @param {number} lineWidth - thickness of the line
 * @param {number} spacing - space to add below the line
 */
function drawSectionLine(doc, type = 'general', lineWidth = 0.5, spacing = 6) {
    const pageW = getPageWidth(doc);

    // Use the Y pointer of the current type
    const y = type === 'academic' ? yAcademic : yGeneral;

    doc.setLineWidth(lineWidth);
    doc.setDrawColor(0, 0, 0); // black line
    doc.line(marginLeft, y, pageW - marginRight, y);

    // Move only the relevant pointer below the line
    if (type === 'academic') yAcademic = y + spacing;
    else yGeneral = y + spacing;
}

// ---------------------------
// Helpers: DB + format
// ---------------------------
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
                    firstdegreesubjects: true
                }
            },
            additionalinfo: true,
            // physicalattributes_na: true,
            secondaryeducations: true,
        }
    });

    if (!application) {
        throw new NotFoundError('Application not found');
    }

    return application;
}

function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

// ---------------------------
// Global layout state & utilities
// ---------------------------

const marginLeft = 20;
const marginRight = 20;
const pageTop = 20;
const defaultFontSize = 11;

// These are set per-doc in generator functions
let yGeneral = 40;   // for general + non-academic flow
let yAcademic = 40;  // for academic-specific flow

function resetYs() {
    yGeneral = 40;
    yAcademic = 40;
}

function getPageHeight(doc) {
    return doc.internal.pageSize.getHeight();
}
function getPageWidth(doc) {
    return doc.internal.pageSize.getWidth();
}

// Ensure there's enough space on the current page for extraHeight; if not, add a new page and reset Y
function ensureSpace(doc, extraHeight = 40, type = 'general') {
    const pageH = getPageHeight(doc);
    const y = type === 'academic' ? yAcademic : yGeneral;
    const bottomLimit = pageH - 25; // leave some bottom margin
    if (y + extraHeight > bottomLimit) {
        doc.addPage();
        if (type === 'academic') yAcademic = pageTop;
        else yGeneral = pageTop;
        return true;
    }
    return false;
}

// Small vertical spacing
function addSpacing(doc, pixels = 6, type = 'general') {
    if (type === 'academic') {
        yAcademic += pixels;
    } else {
        yGeneral += pixels;
    }
}

// Wrapped text drawing (uses jsPDF's splitTextToSize)
function drawWrappedText(doc, text, opts = {}) {
    // opts: { x, maxWidth, fontSize, type }
    const { x = marginLeft, maxWidth = getPageWidth(doc) - marginLeft - marginRight, fontSize = defaultFontSize, type = 'general', bullet } = opts;
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(String(text || ''), maxWidth);
    ensureSpace(doc, lines.length * (fontSize * 0.6) + 8, type);
    const yStart = type === 'academic' ? yAcademic : yGeneral;
    if (bullet) {
        // draw each line with bullet indentation
        let idx = 0;
        lines.forEach(line => {
            const lineY = yStart + idx * (fontSize * 0.6);
            doc.text(`• ${line}`, x, lineY);
            idx++;
        });
        if (type === 'academic') yAcademic = yStart + lines.length * (fontSize * 0.6) + 6;
        else yGeneral = yStart + lines.length * (fontSize * 0.6) + 6;
    } else {
        doc.text(lines, x, yStart);
        if (type === 'academic') yAcademic = yStart + lines.length * (fontSize * 0.6) + 6;
        else yGeneral = yStart + lines.length * (fontSize * 0.6) + 6;
    }
}

// Draw static header/logo/title/declaration/signature placeholders
function drawStaticHeader(doc, mapping = {}, applicationType, application) {
    const pageW = getPageWidth(doc);
    const pageTop = 10;

    // --- Logo (centered) ---
    const logoPath = path.join(__dirname, '..', 'utils', 'assets', 'university_logo.png');
    const logoW = mapping?.logo?.width ?? 20;
    const logoH = mapping?.logo?.height ?? 20;
    let logoY = mapping?.logo?.y ?? pageTop;

    if (fs.existsSync(logoPath)) {
        try {
            const img = fs.readFileSync(logoPath);
            const b64 = Buffer.from(img).toString('base64');
            const logoX = (pageW - logoW) / 2;
            doc.addImage(`data:image/png;base64,${b64}`, 'PNG', logoX, logoY, logoW, logoH);
        } catch (e) {
            console.warn('Logo load failed:', e);
        }
    }

    // --- University Title ---
    const lineSpacing = 6;
    let currentY = logoY + logoH + lineSpacing;

    const uniTitle = mapping?.universityTitle?.text ??
        'Gampaha Wickramarachchi University of Indigenous Medicine, Sri Lanka';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    const uniTitleWidth = doc.getTextWidth(uniTitle);
    doc.text(uniTitle, (pageW - uniTitleWidth) / 2, currentY);

    // --- Form Title ---
    currentY += 10;
    const formTitleText = (mapping?.formTitle && typeof mapping.formTitle.text === 'string')
        ? mapping.formTitle.text
        : (applicationType === 'Academic' ? 'Academic Application' : 'Non Academic Application');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    const formTitleWidth = doc.getTextWidth(formTitleText);
    doc.text(formTitleText, (pageW - formTitleWidth) / 2, currentY);

    // --- Top-right identifiers ---
    const rightX = pageW - 70;
    let infoY = pageTop + 6;
    doc.setFontSize(10);

    doc.setFont('helvetica', 'bold');
    doc.text('Application ID:', rightX, infoY);
    doc.setFont('helvetica', 'normal');
    doc.text(String(application.ApplicationID || ''), rightX + 34, infoY);

    infoY += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Job ID:', rightX, infoY);
    doc.setFont('helvetica', 'normal');
    doc.text(String(application.jobvacancy?.JobID || ''), rightX + 34, infoY);

    infoY += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Closing Date:', rightX, infoY);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(application.jobvacancy?.ExpiryDate), rightX + 34, infoY);

    // --- Set Y positions for content below header ---
    yGeneral = currentY + 15;
    yAcademic = yGeneral;

    // Draw separating line below header
    drawSectionLine(doc, applicationType === 'Academic' ? 'academic' : 'general');
}


// ---------------------------
// General Details Print Section
// ---------------------------
async function drawGeneralDetails(doc, application, type = 'general') {
    if (!application?.applicationgeneraldetails) return;

    const details = application.applicationgeneraldetails;

    // --- Title ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const titleY = type === 'academic' ? yAcademic : yGeneral;
    doc.text('General Details', marginLeft, titleY);
    addSpacing(doc, 10, type);

    // Helper for label + value
    const drawLabelValue = (label, value, x = marginLeft) => {
        const y = type === 'academic' ? yAcademic : yGeneral;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`${label}: `, x, y);
        const labelWidth = doc.getTextWidth(`${label}: `);
        doc.setFont('helvetica', 'normal');
        doc.text(`${value}`, x + labelWidth, y);
        addSpacing(doc, 10, type);
    };

    // --- Fields ---
    drawLabelValue('Post', application.jobvacancy?.Title || '');
    drawLabelValue('Full Name', details.FullName || '');
    drawLabelValue('Address', details.PermanentAddress || '');

    // --- Compact Phone + NIC ---
    let yLine = type === 'academic' ? yAcademic : yGeneral;
    let x = marginLeft;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Phone Number: ', x, yLine);
    x += doc.getTextWidth('Phone Number: ');
    doc.setFont('helvetica', 'normal');
    doc.text(details.PhoneNumber || '', x, yLine);

    x += doc.getTextWidth(details.PhoneNumber || '') + 15;
    doc.setFont('helvetica', 'bold');
    doc.text('NIC: ', x, yLine);
    x += doc.getTextWidth('NIC: ');
    doc.setFont('helvetica', 'normal');
    doc.text(details.NIC || '', x, yLine);
    addSpacing(doc, 10, type);

    // --- Email + DOB ---
    yLine = type === 'academic' ? yAcademic : yGeneral;
    x = marginLeft;
    doc.setFont('helvetica', 'bold');
    doc.text('Email: ', x, yLine);
    x += doc.getTextWidth('Email: ');
    doc.setFont('helvetica', 'normal');
    doc.text(details.Email || '', x, yLine);

    x += doc.getTextWidth(details.Email || '') + 20;
    doc.setFont('helvetica', 'bold');
    doc.text('DOB: ', x, yLine);
    x += doc.getTextWidth('DOB: ');
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(details.DOB), x, yLine);
    addSpacing(doc, 10, type);

    // --- Civil Status + Gender + Citizenship Type ---
    yLine = type === 'academic' ? yAcademic : yGeneral;
    x = marginLeft;
    doc.setFont('helvetica', 'bold');
    doc.text('Civil Status: ', x, yLine);
    x += doc.getTextWidth('Civil Status: ');
    doc.setFont('helvetica', 'normal');
    doc.text(details.CivilStatus || '', x, yLine);

    x += doc.getTextWidth(details.CivilStatus || '') + 30;
    doc.setFont('helvetica', 'bold');
    doc.text('Gender: ', x, yLine);
    x += doc.getTextWidth('Gender: ');
    doc.setFont('helvetica', 'normal');
    doc.text(details.Gender || '', x, yLine);

    x += doc.getTextWidth(details.Gender || '') + 30;
    doc.setFont('helvetica', 'bold');
    doc.text('Citizenship Type: ', x, yLine);
    x += doc.getTextWidth('Citizenship Type: ');
    doc.setFont('helvetica', 'normal');
    doc.text(details.CitizenshipType || '', x, yLine);
    addSpacing(doc, 10, type);

    // --- Citizenship Details ---
    if (details.CitizenshipDetails)
        drawLabelValue('Citizenship Details', details.CitizenshipDetails);

    // --- Ethnicity / Religion ---
    if (details.EthnicityOrReligion)
        drawLabelValue('Ethnicity / Religion', details.EthnicityOrReligion);

    // --- Height + Chest (only for non-academic) ---
    if (type === 'general') {
        yLine = yGeneral;
        x = marginLeft;
        doc.setFont('helvetica', 'bold');
        doc.text('Height: ', x, yLine);
        x += doc.getTextWidth('Height: ');
        doc.setFont('helvetica', 'normal');
        doc.text(`${details.HeightFeet || ''} ft:       ${details.HeightInches || ''} in:       `, x, yLine);

        x += doc.getTextWidth(`${details.HeightFeet || ''} ft ${details.HeightInches || ''} in`) + 15;
        doc.setFont('helvetica', 'bold');
        doc.text('Chest: ', x, yLine);
        x += doc.getTextWidth('Chest: ');
        doc.setFont('helvetica', 'normal');
        doc.text(
            `${details.ChestInches || ''} in:       (If you are applying for a security job, please fill this!)`,
            x,
            yLine
        );
        addSpacing(doc, 10, type);
    }

    // ✅ Correct Y synchronization
    if (type === 'academic') {
        // only update academic Y pointer
        yAcademic = yLine + 30;
    } else {
        // only update general Y pointer
        yGeneral = yLine + 10;
    }

    // ✅ Draw section line correctly at the current Y
    drawSectionLine(doc, type);
}



/////////////////////////////////////////////////////////////// NON ACADEMIC APLLICATION SECTONS PRINT///////////////////////////////////////////////////////////

// ---------------------------
// O/L Results
// ---------------------------
async function drawOLResults(doc, application, type = 'general') {
    const results = application.gce_ol_results;
    if (!results || results.length === 0) return;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const titleY = type === 'academic' ? yAcademic : yGeneral;
    doc.text('G.C.E. O/L Results', marginLeft, titleY);
    addSpacing(doc, 8, type);

    // Prepare table rows
    const tableRows = results.map(result => [
        result.Subject || '',
        result.Grade || '',
        result.ExamYear != null ? result.ExamYear.toString() : '',
    ]);

    // Define table headers
    const tableColumns = [
        { header: 'Subject', dataKey: 'subject' },
        { header: 'Grade', dataKey: 'grade' },
        { header: 'Year', dataKey: 'year' },
    ];

    // Add AutoTable
    doc.autoTable({
        head: [tableColumns.map(col => col.header)],
        body: tableRows,
        startY: type === 'academic' ? yAcademic : yGeneral,
        margin: { left: marginLeft, right: marginRight },
        styles: { font: 'helvetica', fontSize: 11, cellPadding: 3 },
        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
        theme: 'grid',
        didDrawPage: (data) => {
            // update Y position for next sections
            if (type === 'academic') yAcademic = data.cursor.y + 6;
            else yGeneral = data.cursor.y + 6;
        },
    });

    drawSectionLine(doc, 'general');  // draw a line 
}


// ---------------------------
// A/L Results
// ---------------------------
async function drawALResults(doc, application, type = 'general') {
    const results = application.gce_al_results;
    if (!results || results.length === 0) return;

    // --- Title ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    let currentY = type === 'academic' ? yAcademic : yGeneral;
    doc.text('G.C.E. A/L Results', marginLeft, currentY);
    addSpacing(doc, 8, type);

    // --- Use updated Y for table ---
    currentY = type === 'academic' ? yAcademic : yGeneral;

    // --- Prepare table data ---
    const tableRows = results.map(result => [
        result.Subject || '',
        result.Grade || '',
        result.ExamYear != null ? result.ExamYear.toString() : '',
    ]);

    const tableColumns = [
        { header: 'Subject', dataKey: 'subject' },
        { header: 'Grade', dataKey: 'grade' },
        { header: 'Year', dataKey: 'year' },
    ];

    // --- Render AutoTable ---
    doc.autoTable({
        head: [tableColumns.map(col => col.header)],
        body: tableRows,
        startY: currentY, // ✅ use updated Y
        margin: { left: marginLeft, right: marginRight },
        styles: {
            font: 'helvetica',
            fontSize: 11,
            cellPadding: 3,
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: [220, 220, 220],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
        },
        theme: 'grid',
        didDrawPage: (data) => {
            if (type === 'academic') yAcademic = data.cursor.y + 6;
            else yGeneral = data.cursor.y + 6;
        },
    });

    // --- Draw section line ---
    drawSectionLine(doc, type);
}


// ---------------------------
// University Education
// ---------------------------
async function drawUniversityEducation(doc, application, type = 'general') {
    const uniEdus = application.universityeducations;
    if (!uniEdus || uniEdus.length === 0) return;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);

    let currentY = type === 'academic' ? yAcademic : yGeneral;
    doc.text('University Education', marginLeft, currentY);

    // ✅ Immediately update Y pointer
    addSpacing(doc, 8, type); 
    currentY = type === 'academic' ? yAcademic : yGeneral;

    const tableRows = uniEdus.map(edu => {
        const classResult = edu.Class && edu.YearObtained ? `${edu.Class} (${edu.YearObtained})` : '';
        const duration = edu.FromYear && edu.ToYear ? `${edu.FromYear} – ${edu.ToYear}` : '';
        return [
            edu.Institute || '',
            edu.DegreeOrDiploma || '',
            duration,
            classResult,
            edu.IndexNumber || '',
        ];
    });

    const tableColumns = [
        { header: 'University/Institute', dataKey: 'institute' },
        { header: 'Degree/Diploma', dataKey: 'degree' },
        { header: 'Duration', dataKey: 'duration' },
        { header: 'Class (Year Obtained)', dataKey: 'class' },
        { header: 'Index No', dataKey: 'index' },
    ];

    doc.autoTable({
        head: [tableColumns.map(col => col.header)],
        body: tableRows,
        startY: currentY, // ✅ now synced with updated Y pointer
        margin: { left: marginLeft, right: marginRight },
        styles: { font: 'helvetica', fontSize: 11, cellPadding: 3, lineWidth: 0.1 },
        headStyles: { fillColor: [220, 220, 220], textColor: [0,0,0], fontStyle: 'bold' },
        theme: 'grid',
        didDrawPage: (data) => {
            if (type === 'academic') yAcademic = data.cursor.y + 6;
            else yGeneral = data.cursor.y + 6;
        }
    });

    drawSectionLine(doc, type);
}


// ---------------------------
// Professional Qualifications
// ---------------------------
async function drawProfessionalQualifications(doc, application, type = 'general') {
    const qualifications = application.professionalqualifications;
    if (!qualifications || qualifications.length === 0) return;

    // --- Section Title ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const titleY = type === 'academic' ? yAcademic : yGeneral;
    doc.text('Professional Qualifications', marginLeft, titleY);
    addSpacing(doc, 8, type);

    // --- Prepare table rows from Prisma data ---
    const tableRows = qualifications.map(pq => [
        pq.Institution || '',
        pq.QualificationName || '',
        (pq.FromYear && pq.ToYear) ? `${pq.FromYear} – ${pq.ToYear}` : '',
        pq.ResultOrExamPassed || ''
    ]);

    const tableColumns = [
        { header: 'Institution', dataKey: 'institution' },
        { header: 'Qualification', dataKey: 'qualification' },
        { header: 'Duration', dataKey: 'duration' },
        { header: 'Result/Exam Passed', dataKey: 'result' }
    ];

    // --- Render AutoTable ---
    doc.autoTable({
        head: [tableColumns.map(col => col.header)],
        body: tableRows,
        startY: type === 'academic' ? yAcademic : yGeneral,
        margin: { left: marginLeft, right: marginRight },
        styles: { font: 'helvetica', fontSize: 11, cellPadding: 3, lineWidth: 0.1 },
        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
        theme: 'grid',
        didDrawPage: (data) => {
            // ✅ Update Y pointer for next sections
            if (type === 'academic') yAcademic = data.cursor.y + 6;
            else yGeneral = data.cursor.y + 6;
        },
    });

    // --- Draw horizontal line below section ---
    drawSectionLine(doc, type);
}


// ---------------------------
// Employment Histories
// ---------------------------
async function drawEmploymentHistories(doc, application, type = 'general') {
    const histories = application.employmenthistories;
    if (!histories || histories.length === 0) return;

    // --- Section Title ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const titleY = type === 'academic' ? yAcademic : yGeneral;
    doc.text('Employment Histories', marginLeft, titleY);
    addSpacing(doc, 8, type);

    // --- Prepare table rows from Prisma schema ---
    const tableRows = histories.map(emp => [
        emp.Institution || '',
        emp.PostHeld || '',
        emp.FromDate ? formatDate(emp.FromDate) : '',
        emp.ToDate ? formatDate(emp.ToDate) : '',
        emp.LastSalary != null ? emp.LastSalary.toFixed(2) : ''
    ]);

    const tableColumns = [
        { header: 'Institution', dataKey: 'institution' },
        { header: 'Post Held', dataKey: 'post' },
        { header: 'From', dataKey: 'from' },
        { header: 'To', dataKey: 'to' },
        { header: 'Last Salary', dataKey: 'salary' }
    ];

    // --- Render AutoTable ---
    doc.autoTable({
        head: [tableColumns.map(col => col.header)],
        body: tableRows,
        startY: type === 'academic' ? yAcademic : yGeneral,
        margin: { left: marginLeft, right: marginRight },
        styles: { font: 'helvetica', fontSize: 11, cellPadding: 3, lineWidth: 0.1 },
        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
        theme: 'grid',
        didDrawPage: (data) => {
            // ✅ Update Y pointer for next sections
            if (type === 'academic') yAcademic = data.cursor.y + 6;
            else yGeneral = data.cursor.y + 6;
        },
    });

    // --- Draw horizontal line below section ---
    drawSectionLine(doc, type);
}


// ---------------------------
// Experience Details
// ---------------------------
async function drawExperiences(doc, application, type = 'general') {
    const expDetails = application.experiencedetails;
    if (!expDetails || expDetails.length === 0) return;

    // --- Section Title ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const titleY = type === 'academic' ? yAcademic : yGeneral;
    doc.text('Experience Details', marginLeft, titleY);
    addSpacing(doc, 8, type); // slightly smaller than before

    // --- Draw each experience point-wise ---
    const fontSize = 11;
    const bullet = '• ';

    expDetails.forEach(exp => {
        doc.setFont('helvetica', 'normal'); // ensure data is not bold
        const line = `${bullet}${exp.Description || ''}`;
        // draw text and get updated Y position
        drawWrappedText(doc, line, { x: marginLeft, fontSize, type });
        // addSpacing(doc, 1.5, type); // minimal spacing between points
    });

    // --- Extra spacing at the end of section ---
    addSpacing(doc, 4, type);
}


// ---------------------------
// Special Qualifications
// ---------------------------
async function drawSpecialQualifications(doc, application, type = 'general') {
    const specials = application.specialqualifications;
    if (!specials || specials.length === 0) return;

    // --- Section Title ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const titleY = type === 'academic' ? yAcademic : yGeneral;
    doc.text('Special Qualifications', marginLeft, titleY);
    addSpacing(doc, 8, type);

    // --- Draw each special qualification point-wise ---
    const fontSize = 11;
    const bullet = '• ';

    specials.forEach(sq => {
        doc.setFont('helvetica', 'normal'); // ensure data is not bold
        drawWrappedText(doc, `${bullet}${sq.Description || ''}`, { x: marginLeft, fontSize, type });
        // addSpacing(doc, 1, type); // very compact spacing
    });

    // --- Extra spacing at the end of section ---
    addSpacing(doc, 4, type);
}


// ---------------------------
// Sign Section
// ---------------------------
async function drawSignSection(doc, application, type = 'general') {
    let currentY = type === 'academic' ? yAcademic : yGeneral;

    // Add space before section
    currentY += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    const certificationText1 = `
I certify that all the particulars given by me in this application are true and accurate. I am aware that if any particulars are found to be false or inaccurate prior to my selection, my application will be rejected, and that if particulars are found to be false or inaccurate after my selection, I will be dismissed from service without compensation.

Date:……………………………………………


Signature of the applicant:………………………………………………

`;

    currentY = drawWrappedText(doc, certificationText1.trim(), { x: marginLeft, y: currentY, fontSize: 11, returnY: true });

    // Bold specific sentence
    doc.setFont('helvetica', 'bold');
    const boldSentence = "For Public Sector Candidates Only.";
    currentY = drawWrappedText(doc, boldSentence, { x: marginLeft + 50, y: currentY, fontSize: 12, returnY: true });

    // Back to normal text
    doc.setFont('helvetica', 'normal');
    const certificationText2 = `
Application for the post of…………………………………………………………………………………
submitted by Mr./  Mrs./  Ms ……………………………………………………………………………………………………………………………………………………………………………………………………………………is forwarded here with. if he/she is selected for the said post he/she can/cannot be released.


Signature of the Head of the Institution


Name

Designation

Date

Official Seal



`;

    currentY = drawWrappedText(doc, certificationText2.trim(), { x: marginLeft, y: currentY, fontSize: 11, returnY: true });

    currentY += 20; // final spacing

    if (type === 'academic') yAcademic = currentY;
    else yGeneral = currentY;
}


// ---------------------------
// Non Academic Details Print Section
// ---------------------------
async function generateNonAcademicApplicationPDF(applicationID, application) {
    const doc = new jsPDF();
    resetYs();

    // Header
    drawStaticHeader(doc, {}, 'Non_Academic',  application, applicationID);

    // General Details Print 
    await drawGeneralDetails(doc, application, 'general');
    //OL Reslts Print
    await drawOLResults(doc, application, 'general');
    //OL Reslts Print
    await drawALResults(doc, application, 'general');
    //University Education Print
    await drawUniversityEducation(doc, application, 'general');
    //Proffesional Qualifications 
    await drawProfessionalQualifications(doc, application, 'general');
    //Employement Histories
    await drawEmploymentHistories(doc, application, 'general');
    //Experiences Details
    await drawExperiences(doc, application, 'general');
    //Special Qualifications 
    await drawSpecialQualifications(doc, application, 'general');

    //Static Section for signing to applicant
    await drawSignSection(doc, application, 'general')

    // Finally, save to file (or return buffer)
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    return pdfBuffer;
}

/////////////////////////////////////////////////////////////// ACADEMIC APLLICATION SECTONS PRINT///////////////////////////////////////////////////////////


// ---------------------------
// Secondary Educations
// ---------------------------
async function drawSecondaryEducation(doc, application, type = 'academic') {
    await drawOLResults(doc, application, type);
    await drawALResults(doc, application, type);
}


// ---------------------------
// First Degree Main Subjects
// ---------------------------
async function drawFirstDegreeSubjects(doc, application, type = 'academic') {
    const subjects = application.firstDegreeSubjects;
    if (!subjects || subjects.length === 0) return;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const titleY = type === 'academic' ? yAcademic : yGeneral;
    doc.text('Subjects in the First Degree', marginLeft, titleY);
    addSpacing(doc, 8, type);

    const tableRows = subjects.map(s => [
        s.Subject || '',
        s.Result || '',
        s.Year || ''
    ]);
    const tableColumns = [
        { header: 'Subject', dataKey: 'subject' },
        { header: 'Result', dataKey: 'result' },
        { header: 'Year', dataKey: 'year' }
    ];

    doc.autoTable({
        head: [tableColumns.map(c => c.header)],
        body: tableRows,
        startY: type === 'academic' ? yAcademic : yGeneral,
        margin: { left: marginLeft, right: marginRight },
        styles: { font: 'helvetica', fontSize: 11, cellPadding: 3 },
        headStyles: { fillColor: [220, 220, 220], fontStyle: 'bold' },
        theme: 'grid',
        didDrawPage: (data) => {
            if (type === 'academic') yAcademic = data.cursor.y + 6;
            else yGeneral = data.cursor.y + 6;
        },
    });
    drawSectionLine(doc, type);
}


// ---------------------------
// Language Proficiency
// ---------------------------
async function drawLanguageProficiency(doc, application, type = 'academic') {
    const langs = application.languageProficiencies;
    if (!langs || langs.length === 0) return;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const titleY = type === 'academic' ? yAcademic : yGeneral;
    doc.text('Language Proficiency', marginLeft, titleY);
    addSpacing(doc, 8, type);

    langs.forEach(lang => {
        const line = `${lang.Language || ''}: ${lang.Proficiency || ''}`;
        drawWrappedText(doc, line, { x: marginLeft, fontSize: 11, type });
        addSpacing(doc, 4, type);
    });

    addSpacing(doc, 6, type);
}


// ---------------------------
// Employment Records
// ---------------------------
async function drawEmployementRecord(doc, application, type = 'academic') {
    await drawEmploymentHistories(doc, application, type);
}


// ---------------------------
// Research and Publications
// ---------------------------
async function drawResearchAndPublication(doc, application, type = 'academic') {
    const publications = application.researchPublications;
    if (!publications || publications.length === 0) return;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const titleY = type === 'academic' ? yAcademic : yGeneral;
    doc.text('Research & Publications', marginLeft, titleY);
    addSpacing(doc, 8, type);

    const bullet = '• ';
    publications.forEach(pub => {
        drawWrappedText(doc, `${bullet}${pub.Title || ''}`, { x: marginLeft, fontSize: 11, type });
        addSpacing(doc, 4, type);
    });

    addSpacing(doc, 6, type);
}


// ---------------------------
// Referees
// ---------------------------
async function drawReferees(doc, application, type = 'academic') {
    const refs = application.referees;
    if (!refs || refs.length === 0) return;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const titleY = type === 'academic' ? yAcademic : yGeneral;
    doc.text('Referees', marginLeft, titleY);
    addSpacing(doc, 8, type);

    refs.forEach(r => {
        const line = `${r.Name || ''} | ${r.Designation || ''} | ${r.Institution || ''} | Tel: ${r.Contact || ''}`;
        drawWrappedText(doc, line, { x: marginLeft, fontSize: 11, type });
        addSpacing(doc, 4, type);
    });

    addSpacing(doc, 6, type);
}


// ---------------------------
// Additional Information
// ---------------------------
async function drawAdditionalInformation(doc, application, type = 'academic') {
    const addInfo = application.additionalInformation;
    if (!addInfo) return;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const titleY = type === 'academic' ? yAcademic : yGeneral;
    doc.text('Additional Information', marginLeft, titleY);
    addSpacing(doc, 8, type);

    drawWrappedText(doc, addInfo, { x: marginLeft, fontSize: 11, type });
    addSpacing(doc, 6, type);
}

// ---------------------------
// Academic Details Print Section
// ---------------------------

async function generateAcademicApplicationPDF(applicationID, application) {
    const doc = new jsPDF();
    resetYs();

    // Header
    drawStaticHeader(doc, {}, 'Academic', application, applicationID);

    //General Details Print
    await drawGeneralDetails(doc, application, 'academic');
    //Secondary Education
    await drawSecondaryEducation(doc, application, 'academic');
    //University Education
    await drawUniversityEducation(doc, application, 'academic');
    //Subjects in the First Degree
    await drawFirstDegreeSubjects(doc, application, 'academic');
    //Professional Qualification
    await drawProfessionalQualifications(doc, application, 'academic');
    //Language Proficiency
    await drawLanguageProficiency(doc, application, 'academic');
    //Employement Record
    await drawEmployementRecord(doc, application, 'academic');
    //Experiences Details
    await drawExperiences(doc, application, 'academic');
    //Research & Publication
    await drawResearchAndPublication(doc, application, 'academic');
    //Special Qualifications 
    await drawSpecialQualifications(doc, application, 'academic');
    //Referees
    await drawReferees(doc, application, 'academic');
    //Additional Information
    await drawAdditionalInformation(doc, application, 'academic');

    //Static Section for signing to applicant
    await drawSignSection(doc, application, 'general')


    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    return pdfBuffer;
}

// ---------------------------
// Top-level generator 
// ---------------------------

exports.generateApplicationPDF = async (applicationID) => {
  try {
    const application = await fetchApplicationData(applicationID);
    const applicationType = application.jobvacancy?.applicationtemplate?.Type || 'Non_Academic';
    console.log("Application type :" + applicationType);
    

    if (applicationType === 'Academic') {
        return await exports.generateAcademicApplicationPDF(applicationID, application);
    } else {
        return await generateNonAcademicApplicationPDF(applicationID, application);
    }

  } catch (err) {
    console.error('generateApplicationPDF Error:', err);
    throw err; // important to rethrow for express error handling
  }
};


// Also export both specific functions if you want to call them directly:
exports.generateNonAcademicApplicationPDF = generateNonAcademicApplicationPDF;
exports.generateAcademicApplicationPDF = generateAcademicApplicationPDF;
