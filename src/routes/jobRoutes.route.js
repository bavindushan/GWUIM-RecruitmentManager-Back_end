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
 * security:
 *   - bearerAuth: []
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
 *                         type: integer
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
 *                         format: date
 *       500:
 *         description: Internal server error
 */
router.get('/', authMiddleware, asyncHandler(jobController.getAllJobs));

/**
 * @swagger
 * /api/jobs/filter:
 *   get:
 *     summary: Filter job vacancies by department, type, level, or closing date
 *     tags: [Job]
 *     parameters:
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by department
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by job type
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by job level
 *       - in: query
 *         name: closingDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter by closing date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Filtered job vacancies
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
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
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
 *                         format: date
 */
router.get('/filter', authMiddleware, asyncHandler(jobController.getFilteredJobs));

/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     summary: Get a job vacancy by ID
 *     tags: [Job]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The job ID
 *     responses:
 *       200:
 *         description: Job found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     title:
 *                       type: string
 *                     department:
 *                       type: string
 *                     type:
 *                       type: string
 *                     level:
 *                       type: string
 *                     closingDate:
 *                       type: string
 *                       format: date
 *       404:
 *         description: Job not found
 */
router.get('/:id', authMiddleware, asyncHandler(jobController.getJobById));

module.exports = router;
