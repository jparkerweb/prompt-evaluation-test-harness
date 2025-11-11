import express from 'express';
import dashboardController from './dashboard.controller.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authMiddleware, dashboardController.getStats);

export default router;