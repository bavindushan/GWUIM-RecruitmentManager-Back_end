// applicationPrint.service.js
// Full jsPDF-based PDF generator for Academic & Non-Academic applications

const { jsPDF } = require('jspdf');      // Must destructure jsPDF
require('jspdf-autotable');              // attach autoTable to jsPDF prototype
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { NotFoundError, BadRequestError } = require('../utils/AppError');


// ---------------------------
// Label mappings (kept from original)
// ---------------------------
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

// ---------------------------
// Helpers: DB + format
// ---------------------------
async function fetchApplicationData(applicationID) {
    const application = await prisma.application.findUnique({
        where: { ApplicationID: Number(applicationID) },
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
                include: { firstdegreesubjects: true }
            },
            additionalinfo: true,
            secondaryeducations: true,
        }
    });
    if (!application) throw new NotFoundError('Application not found');
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
function drawStaticHeader(doc, mapping, applicationType = 'Non_Academic') {
    // mapping expected to have positions (safe defaults used)
    const pageW = getPageWidth(doc);

    // Logo
    const logoPath = path.join(__dirname, '..', 'utils', 'assets', 'university_logo.png');
    if (fs.existsSync(logoPath)) {
        try {
            const img = fs.readFileSync(logoPath);
            const b64 = Buffer.from(img).toString('base64');
            // Use a reasonable size; mapping may provide positions
            const logoX = mapping?.logo?.x ?? 20;
            const logoY = mapping?.logo?.y ?? 10;
            const logoW = mapping?.logo?.width ?? 30;
            const logoH = mapping?.logo?.height ?? 30;
            doc.addImage(`data:image/png;base64,${b64}`, 'PNG', logoX, logoY, logoW, logoH);
        } catch (e) {
            // fall through silently if image fails
        }
    }

    // Titles
    const uniTitle = mapping?.universityTitle?.text ?? 'Gampaha Wickramarachchi University of Indigenous Medicine, Sri Lanka';
    const uniTitleX = mapping?.universityTitle?.x ?? 60;
    const uniTitleY = mapping?.universityTitle?.y ?? 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(uniTitle, uniTitleX, uniTitleY);

    const formTitleText = (mapping?.formTitle && typeof mapping.formTitle.text === 'string')
        ? mapping.formTitle.text
        : (applicationType === 'Academic' ? 'Academic Application' : 'Non Academic Application');
    const formTitleX = mapping?.formTitle?.x ?? 60;
    const formTitleY = mapping?.formTitle?.y ?? 26;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(formTitleText, formTitleX, formTitleY);

    // After header set initial Y values
    yGeneral = 40;
    yAcademic = 40;
}

// Declaration and signature placeholders (placed on a later page area)
function drawDeclarationAndSignature(doc, mapping) {
    // Place on next page to avoid crowding
    doc.addPage();
    const pageH = getPageHeight(doc);
    const leftX = mapping?.declaration?.textX ?? marginLeft;
    const decY = mapping?.declaration?.textY ?? pageTop + 10;
    const decFontSize = mapping?.declaration?.fontSize || 10;

    drawWrappedText(doc, mapping?.declaration?.text || '', { x: leftX, maxWidth: getPageWidth(doc) - marginLeft - marginRight, fontSize: decFontSize, type: 'general' });

    // Signature placeholders
    const sigDateX = mapping?.signature?.dateX ?? marginLeft;
    const sigDateY = mapping?.signature?.dateY ?? yGeneral + 20;
    const sigFontSize = mapping?.signature?.fontSize || 10;

    // ensure space
    ensureSpace(doc, 40, 'general');
    drawWrappedText(doc, 'Date: ________________________', { x: sigDateX, fontSize: sigFontSize, type: 'general' });
    drawWrappedText(doc, 'Signature: ____________________', { x: sigDateX + 90, fontSize: sigFontSize, type: 'general' });
}

// Public sector block (static paragraphs & placeholders)
function drawPublicSectorBlock(doc, mapping) {
    // Draw on a new page to ensure whole block fits
    ensureSpace(doc, 200, 'academic');
    doc.addPage();
    let x = mapping?.publicSectorCandidates?.x ?? marginLeft;
    let y = mapping?.publicSectorCandidates?.y ?? pageTop + 10;
    const fontSize = mapping?.publicSectorCandidates?.fontSize || 10;
    const maxWidth = mapping?.publicSectorCandidates?.maxWidth ?? getPageWidth(doc) - marginLeft - marginRight;

    const contentLines = [
        'Application for the post of..........................................................................................................................',
        'submitted by Rev./ Prof./ Dr./Mr./ Mrs./ Ms...............................................................................................',
        '..................................................................................................................................................................',
        '..............................................................................................................................is forwarded here with.',
        'If he/she is selected for the said post he/she can/cannot be released.',
        '',
        'Signature of the Head of the Institution : .................................',
        '',
        'Name : .........................................................................................................................',
        'Designation : ...............................................................................................................',
        'Date : .....................................................................',
        '',
        '',
        'Official Seal : .................................'
    ];

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'normal');
    contentLines.forEach(line => {
        const lines = doc.splitTextToSize(line, maxWidth);
        doc.text(lines, x, y);
        y += fontSize * 0.6;
    });
    // After drawing public sector block, set academic Y to current y
    yAcademic = y + 10;
}

// ---------------------------
// General Details drawing (shared between academic & non-academic)
// ---------------------------
function drawGeneralDetails(doc, application, mapping) {
    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('General Details', marginLeft, yGeneral);
    addSpacing(doc, 8, 'general');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    const details = application.applicationgeneraldetails || {};
    for (const [field, label] of Object.entries(generalFieldLabels)) {
        const value = field === 'Post'
            ? (application.jobvacancy?.Title || '')
            : (details[field] ?? '');
        const formatted = (field.toLowerCase().includes('date') || field.toLowerCase() === 'dob') ? formatDate(formValue(value)) : value;
        drawWrappedText(doc, `${label}: ${formatted}`, { x: marginLeft, maxWidth: getPageWidth(doc) - marginLeft - marginRight, fontSize: 11, type: 'general' });
    }

    // Divider
    ensureSpace(doc, 12, 'general');
    doc.setLineWidth(0.3);
    doc.line(marginLeft, yGeneral, getPageWidth(doc) - marginRight, yGeneral);
    addSpacing(doc, 6, 'general');
}

// small helper to safely handle formatting
function formValue(v) {
    return (v === null || v === undefined) ? '' : v;
}

// ---------------------------
// Table helpers using autoTable
// ---------------------------
function drawResultsTable(doc, title, data, columns, type = 'general') {
    if (!data || !data.length) return;
    ensureSpace(doc, 20, type);
    if (type === 'academic') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(title, marginLeft, yAcademic);
        addSpacing(doc, 6, 'academic');
    } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(title, marginLeft, yGeneral);
        addSpacing(doc, 6, 'general');
    }

    const startY = type === 'academic' ? yAcademic : yGeneral;

    doc.autoTable({
        startY,
        head: [columns],
        body: data.map(row => columns.map(col => formValue(row[col] ?? row[colToKey(col)] ?? ''))),
        margin: { left: marginLeft, right: marginRight },
        styles: { fontSize: 10, cellPadding: 3, overflow: 'linebreak' },
        headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0] },
        theme: 'grid',
        didDrawPage: (dataHook) => {
            // update the corresponding Y based on cursor
            if (type === 'academic') yAcademic = dataHook.cursor.y + 8;
            else yGeneral = dataHook.cursor.y + 8;
        }
    });

    // update Y from lastAutoTable if present
    if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
        if (type === 'academic') yAcademic = doc.lastAutoTable.finalY + 8;
        else yGeneral = doc.lastAutoTable.finalY + 8;
    }
}

// helper to map header string to plausible row key (simple heuristic)
function colToKey(colHeader) {
    // try a few transformations
    return colHeader.replace(/\s+/g, '').replace(/–/g, '').replace(/-/g, '').replace(/\./g, '');
}

// ---------------------------
// Advanced sections grouping
// ---------------------------
function drawAdvancedSections(doc, application, type = 'general') {
    // University Education
    drawResultsTable(doc, 'University Education', application.universityeducations || [], ['Institute', 'DegreeOrDiploma', 'FromYear', 'ToYear', 'Class', 'YearObtained', 'IndexNumber'], type);

    // Professional Qualifications
    drawResultsTable(doc, 'Professional Qualifications', application.professionalqualifications || [], ['Institution', 'QualificationName', 'FromYear', 'ToYear', 'ResultOrExamPassed'], type);

    // Language Proficiency: map to simpler keys if necessary
    if (application.languageproficiencies && application.languageproficiencies.length) {
        // ensure keys match: Language, CanSpeak/CanRead/CanWrite -> use readable headers
        const body = application.languageproficiencies.map(r => ({
            Language: r.Language || '',
            Reading: r.CanRead || r.Read || r.ReadAbility || '',
            Writing: r.CanWrite || r.Write || r.WriteAbility || '',
            Speaking: r.CanSpeak || r.Speak || r.Speaking || ''
        }));
        drawResultsTable(doc, 'Language Proficiency', body, ['Language', 'Reading', 'Writing', 'Speaking'], type);
    }

    // Employment Histories
    drawResultsTable(doc, 'Employment History', application.employmenthistories || [], ['PostHeld', 'Institution', 'FromDate', 'ToDate', 'LastSalary'], type);

    // Experience Details - treat as simple bullet-wrapped text
    if (application.experiencedetails && application.experiencedetails.length) {
        ensureSpace(doc, 10, type);
        if (type === 'academic') {
            doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('Experience Details', marginLeft, yAcademic); addSpacing(doc, 6, 'academic');
        } else {
            doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('Experience Details', marginLeft, yGeneral); addSpacing(doc, 6, 'general');
        }
        application.experiencedetails.forEach(exp => {
            drawWrappedText(doc, exp.Description || '', { x: marginLeft, maxWidth: getPageWidth(doc) - marginLeft - marginRight, fontSize: 11, type });
            addSpacing(doc, 4, type);
        });
    }

    // Special Qualifications
    if (application.specialqualifications && application.specialqualifications.length) {
        ensureSpace(doc, 10, type);
        if (type === 'academic') {
            doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('Special Qualifications / Extra-curricular Activities', marginLeft, yAcademic); addSpacing(doc, 6, 'academic');
        } else {
            doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('Special Qualifications / Extra-curricular Activities', marginLeft, yGeneral); addSpacing(doc, 6, 'general');
        }
        application.specialqualifications.forEach(sq => {
            drawWrappedText(doc, sq.Description || '', { x: marginLeft, maxWidth: getPageWidth(doc) - marginLeft - marginRight, fontSize: 11, type });
            addSpacing(doc, 4, type);
        });
    }
}

// ---------------------------
// Draw Non-Academic / Academic details wrappers
// ---------------------------
function drawNonAcademicDetails(doc, application, mapping) {
    // Non-academic flow uses yGeneral
    drawResultsTable(doc, 'G.C.E. O/L Results', application.gce_ol_results || [], ['Subject', 'Grade', 'ExamYear'], 'general');
    drawResultsTable(doc, 'G.C.E. A/L Results', application.gce_al_results || [], ['Subject', 'Grade', 'ExamYear'], 'general');
    drawAdvancedSections(doc, application, 'general');
}

function drawAcademicDetails(doc, application, mapping) {
    // Academic flow uses yAcademic
    drawResultsTable(doc, 'G.C.E. O/L Results', application.gce_ol_results || [], ['Subject', 'Grade', 'ExamYear'], 'academic');
    drawResultsTable(doc, 'G.C.E. A/L Results', application.gce_al_results || [], ['Subject', 'Grade', 'ExamYear'], 'academic');
    drawAdvancedSections(doc, application, 'academic');
}

// ---------------------------
// Main generators
// ---------------------------

async function generateNonAcademicApplicationPDF(applicationID, applicationData) {
    const application = applicationData || await fetchApplicationData(applicationID);
    resetYs();

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    console.log(typeof doc.autoTable); // should print 'function'

    // mapping: the system previously used JSON mapping files. If you have mapping JSON, load it here.
    // We'll attempt to load mapping file for non_academic; if missing, use empty object and safe defaults.
    let mapping = {};
    try {
        const mappingPath = path.join(__dirname, '..', '..', 'uploads', 'templates', 'non_academic_mapping.json');
        if (fs.existsSync(mappingPath)) mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    } catch (e) { mapping = {}; }

    // Draw header/logo/title
    drawStaticHeader(doc, mapping, 'Non_Academic');

    // Top-right identifiers: Application ID, Job ID, Expiry Date
    const rightX = getPageWidth(doc) - 90;
    let infoY = pageTop + 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Application ID:', rightX, infoY);
    doc.setFont('helvetica', 'normal'); doc.text(String(application.ApplicationID || ''), rightX + 34, infoY);
    infoY += 6;
    doc.setFont('helvetica', 'bold'); doc.text('Job ID:', rightX, infoY);
    doc.setFont('helvetica', 'normal'); doc.text(String(application.jobvacancy?.JobID || ''), rightX + 34, infoY);
    infoY += 6;
    doc.setFont('helvetica', 'bold'); doc.text('Expiry Date:', rightX, infoY);
    doc.setFont('helvetica', 'normal'); doc.text(formatDate(application.jobvacancy?.ExpiryDate), rightX + 34, infoY);

    // Move yGeneral a bit down to avoid header overlap
    yGeneral = Math.max(yGeneral, 50);

    // Draw General Details
    drawGeneralDetails(doc, application, mapping);

    // After drawing general details, keep academic flow start below that if needed
    yAcademic = Math.max(yAcademic, yGeneral + 8);

    // Draw non-academic specific sections
    drawNonAcademicDetails(doc, application, mapping);

    // Declaration & signature placeholders on a separate page
    drawDeclarationAndSignature(doc, mapping);

    // Return buffer
    const arrayBuf = doc.output('arraybuffer');
    return Buffer.from(arrayBuf);
}

async function generateAcademicApplicationPDF(applicationID, applicationData) {
    const application = applicationData || await fetchApplicationData(applicationID);
    resetYs();

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    console.log(typeof doc.autoTable); // should print 'function'

    // load mapping for academic if present
    let mapping = {};
    try {
        const mappingPath = path.join(__dirname, '..', '..', 'uploads', 'templates', 'academic_mapping.json');
        if (fs.existsSync(mappingPath)) mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    } catch (e) { mapping = {}; }

    // Draw header/logo/title
    drawStaticHeader(doc, mapping, 'Academic');

    // Top-right identifiers
    const rightX = getPageWidth(doc) - 90;
    let infoY = pageTop + 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Application ID:', rightX, infoY);
    doc.setFont('helvetica', 'normal'); doc.text(String(application.ApplicationID || ''), rightX + 34, infoY);
    infoY += 6;
    doc.setFont('helvetica', 'bold'); doc.text('Job ID:', rightX, infoY);
    doc.setFont('helvetica', 'normal'); doc.text(String(application.jobvacancy?.JobID || ''), rightX + 34, infoY);
    infoY += 6;
    doc.setFont('helvetica', 'bold'); doc.text('Closing Date:', rightX, infoY);
    doc.setFont('helvetica', 'normal'); doc.text(formatDate(application.jobvacancy?.ExpiryDate), rightX + 34, infoY);

    yAcademic = Math.max(yAcademic, 50);

    // Draw General details (shared)
    drawGeneralDetails(doc, application, mapping);

    // Continue academic sections starting below general details
    // Set academicY to just below general detail area
    yAcademic = Math.max(yAcademic, yGeneral + 8);

    // Academic main fields (if mapping.fields contains fixed field positions, we place them near top)
    if (mapping && mapping.fields) {
        // use mapping fields if you want certain fixed fields — fallback to placing them below general details
        for (const [key, coords] of Object.entries(mapping.fields)) {
            const value = application.applicationgeneraldetails?.[key] ?? application.user?.[key] ?? application[key] ?? '';
            if (value !== undefined && value !== null && String(value).trim() !== '') {
                ensureSpace(doc, 12, 'academic');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(coords.fontSize || 10);
                // coords.x,y in mapping are in original PDF coords; when using jsPDF we fall back to flow mode
                // So we write label + value in flow mode
                drawWrappedText(doc, `${coords.label || key}: ${formValue(value)}`, { x: marginLeft, maxWidth: getPageWidth(doc) - marginLeft - marginRight, fontSize: coords.fontSize || 10, type: 'academic' });
            }
        }
    }

    // Draw academic-specific sections
    drawAcademicDetails(doc, application, mapping);

    // If mapping requests public sector block, draw it
    if (mapping && mapping.publicSectorCandidates) {
        drawPublicSectorBlock(doc, mapping);
    }

    // Declaration & signature placeholders (separate page)
    drawDeclarationAndSignature(doc, mapping);

    // Return buffer
    const arrayBuf = doc.output('arraybuffer');
    return Buffer.from(arrayBuf);
}

// ---------------------------
// Top-level generator (routes here in your app should call this)
// ---------------------------

exports.generateApplicationPDF = async (applicationID) => {
  try {
    const application = await fetchApplicationData(applicationID);
    const applicationType = application.jobvacancy?.applicationtemplate?.Type || 'Non_Academic';

    if (String(applicationType).toLowerCase().includes('academic')) {
      return await generateAcademicApplicationPDF(applicationID, application);
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
