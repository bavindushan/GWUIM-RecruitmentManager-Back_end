const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const adminController = require('../controllers/AdminController.controller');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management
 */
/**
 * @swagger
 * /api/admins/sign-in:
 *   post:
 *     summary: Admin sign in
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 example: yourpassword
 *     responses:
 *       200:
 *         description: Successful admin login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 admin:
 *                   type: object
 *                   properties:
 *                     AdminID:
 *                       type: integer
 *                     FullName:
 *                       type: string
 *                     Email:
 *                       type: string
 *                     Department:
 *                       type: string
 *                     PhoneNumber:
 *                       type: string
 *       400:
 *         description: Email and password required
 *       401:
 *         description: Invalid credentials
 */
router.post('/sign-in', asyncHandler(adminController.loginAdmin));

/**
 * @swagger
 * /api/admins/sign-up:
 *   post:
 *     summary: Admin sign up
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - password
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 example: yourpassword
 *               department:
 *                 type: string
 *                 example: IT
 *               phoneNumber:
 *                 type: string
 *                 example: "+1234567890"
 *     responses:
 *       201:
 *         description: Admin registered successfully
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
 *                     AdminID:
 *                       type: integer
 *                     FullName:
 *                       type: string
 *                     Email:
 *                       type: string
 *                     Department:
 *                       type: string
 *                     PhoneNumber:
 *                       type: string
 *       400:
 *         description: Missing required fields
 */
router.post('/sign-up', asyncHandler(adminController.signUpAdmin));

/**
 * @swagger
 * /api/admins/job-vacancies:
 *   post:
 *     summary: Post a new job vacancy
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - type
 *               - department
 *               - level
 *               - expiryDate
 *               - status
 *               - templateID
 *             properties:
 *               title:
 *                 type: string
 *                 example: Assistant Lecturer
 *               description:
 *                 type: string
 *                 example: The role involves delivering lectures and tutorials...
 *               type:
 *                 type: string
 *                 enum: [Academic, NonAcademic]
 *               department:
 *                 type: string
 *                 example: Computer Science
 *               level:
 *                 type: string
 *                 example: Entry Level
 *               expiryDate:
 *                 type: string
 *                 format: date
 *                 example: 2025-12-31
 *               status:
 *                 type: string
 *                 enum: [Open, Closed, Suspended]
 *               templateID:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Job vacancy posted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 job:
 *                   type: object
 *       400:
 *         description: Validation errors or unauthorized access
 *       401:
 *         description: Unauthorized
 */
router.post( '/job-vacancies', authMiddleware, asyncHandler(adminController.postJobVacancy));

module.exports = router;
