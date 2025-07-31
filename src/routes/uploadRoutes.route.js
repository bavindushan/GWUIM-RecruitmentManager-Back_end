const express = require('express');
const router = express.Router();
const upload = require('../utils/multerConfig');
const uploadController = require('../controllers/uploadController.controller');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/uploads/template-file:
 *   post:
 *     summary: Upload application template file
 *     description: Allows admin to upload a template file (PDF/DOCX) and receive the path to store.
 *     tags:
 *       - Uploads
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: File uploaded successfully
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
 *                     filePath:
 *                       type: string
 *       400:
 *         description: No file uploaded or invalid file type
 *       401:
 *         description: Unauthorized
 */
router.post( '/template-file', authMiddleware, upload.single('file'), uploadController.uploadTemplateFile);

/**
 * @swagger
 * /api/uploads/template-file/{filename}:
 *   delete:
 *     summary: Delete an uploaded template file by filename
 *     description: Deletes the specified template file from the server.
 *     tags:
 *       - Uploads
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: filename
 *         in: path
 *         required: true
 *         description: The filename of the template file to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request - filename missing
 *       404:
 *         description: File not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/template-file/:filename', authMiddleware, uploadController.deleteTemplateFile);

module.exports = router;
