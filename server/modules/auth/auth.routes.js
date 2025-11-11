import express from 'express';
import authController from './auth.controller.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/login', authController.login);
router.post('/register', authController.register);

// Protected routes
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.getMe);

export default router;