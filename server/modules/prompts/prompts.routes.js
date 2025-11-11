import express from 'express';
import promptsController from './prompts.controller.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Prompt routes
router.get('/stats', promptsController.getStats);
router.get('/', promptsController.getPrompts);
router.post('/', promptsController.createPrompt);
router.get('/:id', promptsController.getPromptById);
router.get('/:id/editable', promptsController.checkPromptEditable);
router.patch('/:id/name', promptsController.updatePromptName);
router.put('/:id', promptsController.updatePrompt);
router.delete('/:id', promptsController.deletePrompt);
router.get('/:id/versions', promptsController.getPromptVersions);

export default router;