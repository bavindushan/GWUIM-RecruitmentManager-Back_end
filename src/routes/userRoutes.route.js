const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController.controller');
const asyncHandler = require('express-async-handler');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User management
 */

/**
 * @swagger
 * /user/sign-in:
 *   post:
 *     summary: Sign in
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login
 */
router.post('/sign-in', asyncHandler(userController.signIn));

/**
 * @swagger
 * /user:
 *   get:
 *     summary: Get all users
 *     tags: [User]
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/', asyncHandler(userController.getAllUsers));

module.exports = router;
