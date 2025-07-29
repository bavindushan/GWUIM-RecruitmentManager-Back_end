const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes.route');
const jobRoutes = require('./jobRoutes.route');

router.use('/user', userRoutes);
router.use('/jobs', jobRoutes);

module.exports = router;
