const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');
const jobController = require('../controllers/jobController.controller');

/**
 * @swagger
 * tags:
 *   name: Job
 *   description: Job vacancy management
 */

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: Get all job vacancies
 *     tags: [Job]
 *     responses:
 *       200:
 *         description: List of job vacancies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 results:
 *                   type: integer
 *                   example: 3
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       department:
 *                         type: string
 *                       type:
 *                         type: string
 *                       level:
 *                         type: string
 *                       closingDate:
 *                         type: string
 *                         format: date-time
 *       500:
 *         description: Internal server error
 */
router.get('/',authMiddleware, asyncHandler(jobController.getAllJobs));

module.exports = router;
