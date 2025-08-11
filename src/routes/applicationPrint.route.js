const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');
const applicationPrintController = require('../controllers/applicationPrint.controller');

/**
 * @swagger
 * tags:
 *   name: Applications Download
 *   description: Admin management
 */

/**
 * @swagger
 * /api/applications/download/{applicationId}:
 *   get:
 *     summary: Download filled Non-Academic or Academic Application PDF
 *     description: Generates and downloads the filled PDF application form for the given application ID. Requires authentication.
 *     tags:
 *       - Applications Download
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: applicationId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique identifier of the application to generate PDF for
 *     responses:
 *       200:
 *         description: PDF file generated and sent successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid Application ID supplied
 *       404:
 *         description: Application or PDF template not found
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       500:
 *         description: Internal server error during PDF generation
 */
router.get('/download/:applicationId', authMiddleware, asyncHandler(applicationPrintController.downloadApplication));

module.exports = router;
