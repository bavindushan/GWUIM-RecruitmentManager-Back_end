const express = require('express');
const router = express.Router();
const applicationTemplateController = require('../controllers/applicationTemplateController.controller');
const authMiddleware = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');

/**
 * @swagger
 * /api/application-templates:
 *   post:
 *     summary: Upload an application template
 *     description: Allows an admin to upload an academic or non-academic application template.
 *     tags:
 *       - Application Templates
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Type
 *               - FilePath
 *             properties:
 *               Type:
 *                 type: string
 *                 enum: [Academic, Non-Academic]
 *                 description: The type of application template.
 *               FilePath:
 *                 type: string
 *                 description: Path to the uploaded file (relative or absolute).
 *     responses:
 *       201:
 *         description: Application template uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     TemplateID:
 *                       type: integer
 *                     Type:
 *                       type: string
 *                     FilePath:
 *                       type: string
 *                     UploadedBy:
 *                       type: integer
 *                     UploadDate:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request - Missing or invalid fields
 *       401:
 *         description: Unauthorized - Missing or invalid token
 */
router.post( '/add', authMiddleware, asyncHandler(applicationTemplateController.uploadApplicationTemplate));

module.exports = router;
