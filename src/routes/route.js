const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes.route');
const jobRoutes = require('./jobRoutes.route');
const applicationRoutes = require('./applicationRoutes.route');
const fileRoutes = require('./fileRoutes.route');
const apllicationTemplateRoutes = require('./applicationTemplateRoutes.route');
const uploadRoutes = require('./uploadRoutes.route');
const adminRoutes = require('./AdminRoutes.route')

router.use('/user', userRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);
router.use('/files', fileRoutes);
router.use('/application-templates', apllicationTemplateRoutes);
router.use('/uploads', uploadRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
