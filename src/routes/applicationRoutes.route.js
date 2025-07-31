const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');
const applicationController = require('../controllers/applicationController.controller');

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

module.exports = router;
