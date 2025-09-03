const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const authMiddleware = require('../middleware/authMiddleware');
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

/**
 * @swagger
 * /api/superadmin/admins:
 *   post:
 *     summary: SuperAdmin creates a new Admin
 *     tags: [SuperAdmin]
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
 *         description: Admin created successfully
 *       400:
 *         description: Missing required fields
 */
router.post('/admins',authMiddleware, asyncHandler(superAdminController.createAdmin));

/**
 * @swagger
 * /api/superadmin/admins/{id}:
 *   put:
 *     summary: Update admin information
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Admin ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: admin@example.com
 *               department:
 *                 type: string
 *                 example: HR
 *               phoneNumber:
 *                 type: string
 *                 example: "+1234567890"
 *     responses:
 *       200:
 *         description: Admin updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Admin not found
 */
router.put('/admins/:id', authMiddleware, asyncHandler(superAdminController.updateAdmin));

/**
 * @swagger
 * /api/superadmin/admins/{id}/password:
 *   post:
 *     summary: Change admin password
 *     description: SuperAdmin can change an admin's password without knowing the old one.
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Admin ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newPassword:
 *                 type: string
 *                 example: newsecurepassword123
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Admin not found
 */
router.post('/admins/:id/password', authMiddleware, asyncHandler(superAdminController.changeAdminPassword));

/**
 * @swagger
 * /api/superadmin/admins/{id}:
 *   delete:
 *     summary: Soft delete admin
 *     description: Marks admin as deleted without removing the record from the database.
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Admin ID
 *     responses:
 *       200:
 *         description: Admin deleted successfully (soft delete)
 *       404:
 *         description: Admin not found
 */
router.delete('/admins/:id', authMiddleware, asyncHandler(superAdminController.softDeleteAdmin));

/**
 * @swagger
 * /api/superadmin/auditlog:
 *   get:
 *     summary: Get all audit logs
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of audit logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       LogID:
 *                         type: integer
 *                       ActorID:
 *                         type: integer
 *                       ActorRole:
 *                         type: string
 *                       Action:
 *                         type: string
 *                       Timestamp:
 *                         type: string
 *                         format: date-time
 *                       Details:
 *                         type: string
 */
router.get('/auditlog', authMiddleware, asyncHandler(superAdminController.getAllAuditLogs));

/**
 * @swagger
 * /api/superadmin/admins:
 *   get:
 *     summary: Get all admins
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of admins retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       AdminID:
 *                         type: integer
 *                       FullName:
 *                         type: string
 *                       Email:
 *                         type: string
 *                       Department:
 *                         type: string
 *                       PhoneNumber:
 *                         type: string
 *                       CreatedAt:
 *                         type: string
 *                         format: date-time
 *                       UpdatedAt:
 *                         type: string
 *                         format: date-time
 */
router.get('/admins', authMiddleware, asyncHandler(superAdminController.getAllAdmins));


module.exports = router;
