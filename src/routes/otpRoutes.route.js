const express = require('express');
const router = express.Router();
const { generateOTP, verifyOTP } = require('../controllers/otpController.controller');
const authMiddleware = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');

/**
 * @swagger
 * /api/otp/generate-otp:
 *   post:
 *     summary: Generate OTP for user verification
 *     description: Generates a one-time password (OTP), stores it securely with expiration, and sends it to the user's registered phone number.
 *     tags:
 *       - OTP
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OTP generated and sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: OTP generated and sent successfully
 *       401:
 *         description: Unauthorized - user not logged in
 *       500:
 *         description: Server error
 */
router.post('/generate-otp', authMiddleware, asyncHandler(generateOTP));

/**
 * @swagger
 * /api/otp/verify-otp:
 *   post:
 *     summary: Verify OTP for user actions
 *     description: Verifies the OTP provided by the user before performing sensitive actions like password or username changes.
 *     tags:
 *       - OTP
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otp
 *             properties:
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: OTP verified successfully
 *       400:
 *         description: Invalid or expired OTP
 *       401:
 *         description: Unauthorized - user not logged in
 *       500:
 *         description: Server error
 */
router.post('/verify-otp', authMiddleware, asyncHandler(verifyOTP));

module.exports = router;
