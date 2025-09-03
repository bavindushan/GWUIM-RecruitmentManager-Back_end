const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const superAdminController = require('../controllers/superAdminController.controller');

/**
 * @swagger
 * tags:
 *   name: SuperAdmin
 *   description: SuperAdmin management
 */

/**
 * @swagger
 * /api/super-admin/sign-in:
 *   post:
 *     summary: SuperAdmin sign in
 *     tags: [SuperAdmin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Email
 *               - Password
 *             properties:
 *               Email:
 *                 type: string
 *                 example: superadmin@example.com
 *               Password:
 *                 type: string
 *                 example: yourpassword
 *     responses:
 *       200:
 *         description: Successful SuperAdmin login
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
 *                 superAdmin:
 *                   type: object
 *                   properties:
 *                     SuperAdminID:
 *                       type: integer
 *                     FullName:
 *                       type: string
 *                     Email:
 *                       type: string
 *                     PhoneNumber:
 *                       type: string
 *       400:
 *         description: Email and password required
 *       401:
 *         description: Invalid credentials
 */
router.post('/sign-in', asyncHandler(superAdminController.signInSuperAdmin));

/**
 * @swagger
 * /api/super-admin/sign-up:
 *   post:
 *     summary: SuperAdmin sign up
 *     tags: [SuperAdmin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - FullName
 *               - Email
 *               - Password
 *             properties:
 *               FullName:
 *                 type: string
 *                 example: John Doe
 *               Email:
 *                 type: string
 *                 example: superadmin@example.com
 *               Password:
 *                 type: string
 *                 example: yourpassword
 *               PhoneNumber:
 *                 type: string
 *                 example: "+1234567890"
 *     responses:
 *       201:
 *         description: SuperAdmin registered successfully
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
 *                     SuperAdminID:
 *                       type: integer
 *                     FullName:
 *                       type: string
 *                     Email:
 *                       type: string
 *                     PhoneNumber:
 *                       type: string
 *       400:
 *         description: Missing required fields
 */
router.post('/sign-up', asyncHandler(superAdminController.signUpSuperAdmin));

module.exports = router;
