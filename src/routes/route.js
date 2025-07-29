const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes.route');
const jobRoutes = require('./jobRoutes.route');
const applicationRoutes = require('./applicationRoutes.route');

router.use('/user', userRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);

module.exports = router;
