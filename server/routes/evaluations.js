import express from 'express';
import evaluationsController from '../modules/evaluations/evaluations.controller.js';
import { authMiddleware, sseAuthMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to most routes
router.use((req, res, next) => {
  // Use SSE auth middleware for the stream endpoint, regular auth for others
  if (req.path.endsWith('/stream')) {
    return sseAuthMiddleware(req, res, next);
  } else {
    return authMiddleware(req, res, next);
  }
});

// Evaluation routes
router.post('/', evaluationsController.create);
router.get('/', evaluationsController.getAll);
router.get('/:id', evaluationsController.getById);
router.patch('/:id/name', evaluationsController.updateEvaluationName);
router.get('/:id/status', evaluationsController.validateStatus);
router.post('/:id/start', evaluationsController.start);
router.post('/:id/stop', evaluationsController.stopEvaluation);
router.post('/:id/reset', evaluationsController.resetEvaluation);
router.post('/:id/resume', evaluationsController.resumeEvaluation);
router.post('/:id/retry-errors', evaluationsController.retryErrors);
router.post('/:id/rerun', evaluationsController.rerunEvaluation);
router.get('/:id/results', evaluationsController.getResults);
router.get('/:id/stats', evaluationsController.getStats);
router.get('/:id/stream', evaluationsController.streamProgress);
router.delete('/:id', evaluationsController.delete);

export default router;