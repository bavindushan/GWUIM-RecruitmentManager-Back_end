const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController.controller');

// ------------------------------------------


const asyncHandler = require('express-async-handler');
const userController = require('../controller/customer.controller');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User management, signin and signup
 */


/**
 * @swagger
 * /customer/sign-in:
 *   post:
 *     summary: Customer sign in
 *     tags: [Customer]
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
 *         description: Sign in successful
 */
router.post('/sign-in', asyncHandler(userController.signIn));

router.get('/', userController.getAllUsers);

module.exports = router;