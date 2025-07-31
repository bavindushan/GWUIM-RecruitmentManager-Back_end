const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');
const applicationController = require('../controllers/applicationController.controller');

/**
 * @swagger
 * /api/applications/special-qualifications:
 *   post:
 *     summary: Submit special qualifications for an application
 *     description: Allows a logged-in user to submit one or more special qualification records under a specific job application.
 *     tags:
 *       - Applications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobId:
 *                 type: integer
 *                 example: 1
 *               specialQualifications:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     Description:
 *                       type: string
 *                       example: "Certified Scrum Master"
 *     responses:
 *       201:
 *         description: Special qualifications submitted successfully
 *       400:
 *         description: Bad request - missing or invalid fields
 *       401:
 *         description: Unauthorized - user not logged in
 */
router.post( '/special-qualifications', authMiddleware, asyncHandler(applicationController.submitSpecialQualifications));

/**
 * @swagger
 * /api/applications/research-and-publications:
 *   post:
 *     summary: Submit research and publications for an application
 *     description: Allows a logged-in user to submit one or more research and publication records under a specific job application.
 *     tags:
 *       - Applications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobId:
 *                 type: integer
 *                 example: 1
 *               publications:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     Description:
 *                       type: string
 *                       example: "Published a research paper on AI in 2023."
 *     responses:
 *       201:
 *         description: Research and publications submitted successfully
 *       400:
 *         description: Bad request - missing or invalid fields
 *       401:
 *         description: Unauthorized - user not logged in
 */
router.post('/research-and-publications', authMiddleware, asyncHandler(applicationController.submitResearchAndPublications));

/**
 * @swagger
 * /api/applications/professional-qualifications:
 *   post:
 *     summary: Submit professional qualifications for an application
 *     description: Allows a logged-in user to submit one or more professional qualifications under a specific job application.
 *     tags:
 *       - Applications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobId:
 *                 type: integer
 *                 example: 1
 *               qualifications:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     Institution:
 *                       type: string
 *                       example: "ABC Institute"
 *                     QualificationName:
 *                       type: string
 *                       example: "Diploma in Computer Science"
 *                     FromYear:
 *                       type: integer
 *                       example: 2019
 *                     ToYear:
 *                       type: integer
 *                       example: 2021
 *                     ResultOrExamPassed:
 *                       type: string
 *                       example: "Passed with Merit"
 *     responses:
 *       201:
 *         description: Professional qualifications submitted successfully
 *       400:
 *         description: Bad request - missing or invalid fields
 *       401:
 *         description: Unauthorized - user not logged in
 */
router.post('/professional-qualifications', authMiddleware, asyncHandler(applicationController.submitProfessionalQualifications));

/**
 * @swagger
 * /api/applications/language-proficiencies:
 *   post:
 *     summary: Submit language proficiencies for an application
 *     description: Allows a logged-in user to submit one or more language proficiency records under a specific job application.
 *     tags:
 *       - Applications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobId:
 *                 type: integer
 *                 example: 1
 *               languageProficiencies:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     Language:
 *                       type: string
 *                       example: "English"
 *                     CanSpeak:
 *                       type: string
 *                       enum: [Yes, No]
 *                       example: "Yes"
 *                     CanRead:
 *                       type: string
 *                       enum: [Yes, No]
 *                       example: "Yes"
 *                     CanWrite:
 *                       type: string
 *                       enum: [Yes, No]
 *                       example: "No"
 *                     CanTeach:
 *                       type: string
 *                       enum: [Yes, No]
 *                       example: "No"
 *     responses:
 *       201:
 *         description: Language proficiencies submitted successfully
 *       400:
 *         description: Bad request - missing or invalid fields
 *       401:
 *         description: Unauthorized - user not logged in
 */
router.post('/language-proficiencies', authMiddleware, asyncHandler(applicationController.submitLanguageProficiencies));

/**
 * @swagger
 * /api/applications/experience-details:
 *   post:
 *     summary: Submit experience details for an application
 *     description: Allows a logged-in user to submit one or more experience details under a specific job application.
 *     tags:
 *       - Applications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         description: Bearer token
 *         schema:
 *           type: string
 *           example: Bearer <your_access_token>
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobId:
 *                 type: integer
 *                 example: 1
 *               experienceDetails:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     Description:
 *                       type: string
 *                       example: "Managed team of 10 developers in a software project."
 *     responses:
 *       201:
 *         description: Experience details submitted successfully
 *       400:
 *         description: Bad request - missing or invalid fields
 *       401:
 *         description: Unauthorized - user not logged in
 */
router.post('/experience-details', authMiddleware, asyncHandler(applicationController.submitExperienceDetails));

/**
 * @swagger
 * /api/applications/employment-histories:
 *   post:
 *     summary: Submit employment histories for an application
 *     description: Allows a logged-in user to submit one or more employment history records under a specific job application.
 *     tags:
 *       - Applications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         description: Bearer token
 *         schema:
 *           type: string
 *           example: Bearer <your_access_token>
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobId:
 *                 type: integer
 *                 example: 1
 *               employmentHistories:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     PostHeld:
 *                       type: string
 *                       example: "Software Developer"
 *                     Institution:
 *                       type: string
 *                       example: "Tech Solutions Ltd."
 *                     FromDate:
 *                       type: string
 *                       format: date
 *                       example: "2020-01-01"
 *                     ToDate:
 *                       type: string
 *                       format: date
 *                       example: "2022-06-30"
 *                     LastSalary:
 *                       type: number
 *                       format: float
 *                       example: 75000.50
 *     responses:
 *       201:
 *         description: Employment histories submitted successfully
 *       400:
 *         description: Bad request - missing or invalid fields
 *       401:
 *         description: Unauthorized - user not logged in
 */
router.post('/employment-histories', authMiddleware, asyncHandler(applicationController.submitEmploymentHistories));

/**
 * @swagger
 * /applications/references:
 *   post:
 *     summary: Submit a reference for a job application
 *     tags:
 *       - Applications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               applicationId:
 *                 type: integer
 *               name:
 *                 type: string
 *               designation:
 *                 type: string
 *               address:
 *                 type: string
 *             required:
 *               - applicationId
 *               - name
 *               - designation
 *               - address
 *     responses:
 *       201:
 *         description: Reference submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Reference submitted successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     reference:
 *                       $ref: '#/components/schemas/ApplicationReference'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/references', authMiddleware, asyncHandler(applicationController.submitApplicationReferences));

/**
 * @swagger
 * /api/applications/general-details:
 *   post:
 *     summary: Submit general application details
 *     description: Allows a logged-in user to submit the general details for a job application.
 *     tags:
 *       - Applications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         description: Bearer token
 *         schema:
 *           type: string
 *           example: Bearer <your_access_token>
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobId:
 *                 type: integer
 *                 example: 1
 *               generalDetails:
 *                 type: object
 *                 properties:
 *                   PostApplied:
 *                     type: string
 *                     example: "Software Engineer"
 *                   FullName:
 *                     type: string
 *                     example: "Bavindu Shan"
 *                   NameWithInitials:
 *                     type: string
 *                     example: "B. Shan"
 *                   NIC:
 *                     type: string
 *                     example: "200112345678"
 *                   DOB:
 *                     type: string
 *                     format: date
 *                     example: "2001-05-20"
 *                   Gender:
 *                     type: string
 *                     enum: [Male, Female, Other, PreferNotToSay]
 *                   PhoneNumber:
 *                     type: string
 *                     example: "0771234567"
 *                   Email:
 *                     type: string
 *                     example: "bavindushan@example.com"
 *                   PresentAddress:
 *                     type: string
 *                     example: "123 Main Street"
 *                   PermanentAddress:
 *                     type: string
 *                     example: "123 Main Street"
 *                   CivilStatus:
 *                     type: string
 *                     example: "Single"
 *                   CitizenshipType:
 *                     type: string
 *                     enum: [Descent, Registration]
 *                   CitizenshipDetails:
 *                     type: string
 *                     example: "Registered in 2005"
 *                   EthnicityOrReligion:
 *                     type: string
 *                     example: "Sinhala"
 *     responses:
 *       201:
 *         description: Application general details submitted successfully
 *       400:
 *         description: Bad request - missing or invalid fields
 *       401:
 *         description: Unauthorized - user not logged in
 */
router.post('/general-details', authMiddleware, asyncHandler(applicationController.submitGeneralDetails));

/**
 * @swagger
 * /api/applications/gce-al-results:
 *   post:
 *     summary: Submit GCE A/L results for an application
 *     description: Allows a logged-in user to submit one or more A/L subject results under a specific job application.
 *     tags:
 *       - Applications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         description: Bearer token
 *         schema:
 *           type: string
 *           example: Bearer <your_access_token>
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobId:
 *                 type: integer
 *                 example: 1
 *               alResults:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     Subject:
 *                       type: string
 *                       example: "Combined Maths"
 *                     Grade:
 *                       type: string
 *                       example: "A"
 *     responses:
 *       201:
 *         description: GCE A/L results submitted successfully
 *       400:
 *         description: Bad request - missing or invalid fields
 *       401:
 *         description: Unauthorized - user not logged in
 */
router.post('/gce-al-results', authMiddleware, asyncHandler(applicationController.submitGceAlResults));

/**
 * @swagger
 * /api/applications/gce-ol-results:
 *   post:
 *     summary: Submit GCE O/L results for an application
 *     description: Allows a logged-in user to submit one or more O/L subject results under a specific job application.
 *     tags:
 *       - Applications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         description: Bearer token
 *         schema:
 *           type: string
 *           example: Bearer <your_access_token>
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobId:
 *                 type: integer
 *                 example: 1
 *               olResults:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     Subject:
 *                       type: string
 *                       example: "Mathematics"
 *                     Grade:
 *                       type: string
 *                       example: "A"
 *     responses:
 *       201:
 *         description: GCE O/L results submitted successfully
 *       400:
 *         description: Bad request - missing or invalid fields
 *       401:
 *         description: Unauthorized - user not logged in
 */
router.post('/gce-ol-results', authMiddleware, asyncHandler(applicationController.submitGceOlResults));

/**
 * @swagger
 * /api/applications/attachments:
 *   post:
 *     summary: Save an application attachment record
 *     description: Allows a logged-in user to save details of an uploaded attachment (file) for a specific application.
 *     tags:
 *       - Applications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - applicationId
 *               - fileType
 *               - filePath
 *             properties:
 *               applicationId:
 *                 type: integer
 *                 example: 1
 *               fileType:
 *                 type: string
 *                 example: "resume/pdf"
 *               filePath:
 *                 type: string
 *                 example: "http://localhost:5000/uploads/resumes/1753935211621-593775319.pdf"
 *     responses:
 *       201:
 *         description: Application attachment saved successfully
 *       400:
 *         description: Bad request - missing or invalid fields
 *       401:
 *         description: Unauthorized - user not logged in
 */
router.post('/attachments', authMiddleware, asyncHandler(applicationController.saveApplicationAttachment));

module.exports = router;
