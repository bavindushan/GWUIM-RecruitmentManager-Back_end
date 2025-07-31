const express = require('express');
const router = express.Router();
const upload = require('../utils/uploadMiddleware');
const fileController = require('../controllers/fileController.controller');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/files/upload:
 *   post:
 *     summary: Upload a file (e.g., resume or certificate)
 *     description: Allows a logged-in user to upload a file. The file will be stored on the server and the file URL will be returned.
 *     tags:
 *       - Files
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
 *                 description: The file to upload
 *     responses:
 *       200:
 *         description: File uploaded successfully
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
 *                   example: File uploaded successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     fileUrl:
 *                       type: string
 *                       example: http://localhost:5000/uploads/resumes/example.pdf
 *       400:
 *         description: No file uploaded
 *       401:
 *         description: Unauthorized - user not logged in
 */
router.post('/upload', authMiddleware, upload.single('file'), fileController.uploadAttachment);

/**
 * @swagger
 * /files/delete/{filename}:
 *   delete:
 *     summary: Delete a previously uploaded file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         schema:
 *           type: string
 *         required: true
 *         description: The name of the file to delete
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       400:
 *         description: Filename is required
 *       404:
 *         description: File not found
 */
router.delete('/delete/:filename', authMiddleware, fileController.deleteAttachment);

module.exports = router;
