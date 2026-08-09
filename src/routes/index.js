const express = require('express');
const healthRoutes = require('./health.routes');
const publicRoutes = require('./public.routes');
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/public', publicRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
