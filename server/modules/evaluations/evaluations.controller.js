import evaluationsService from './evaluations.service.js';
import { AppError } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';
import sseManager from '../../services/sseManager.js';

class EvaluationsController {
  /**
   * Create a new evaluation
   */
  async create(req, res, next) {
    try {
      const evaluation = await evaluationsService.createEvaluation(req.body, req.user.id);
      res.status(201).json({
        success: true,
        data: evaluation
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all evaluations with pagination, sorting, and filtering
   */
  async getAll(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 50;
      const sortBy = req.query.sortBy || 'created_at';
      const sortDirection = req.query.sortDirection || 'desc';

      // Filter parameters
      const filters = {
        status: req.query.status,
        prompt: req.query.prompt,
        dataset: req.query.dataset,
        model: req.query.model,
        creator: req.query.creator,
        accuracy_min: req.query.accuracy_min ? parseFloat(req.query.accuracy_min) : undefined,
        accuracy_max: req.query.accuracy_max ? parseFloat(req.query.accuracy_max) : undefined,
        processing_time_min: req.query.processing_time_min ? parseFloat(req.query.processing_time_min) : undefined,
        processing_time_max: req.query.processing_time_max ? parseFloat(req.query.processing_time_max) : undefined,
        created_at_from: req.query.created_at_from,
        created_at_to: req.query.created_at_to
      };
      
      const result = await evaluationsService.getEvaluations(page, pageSize, sortBy, sortDirection, filters);
      
      res.json({
        success: true,
        data: result.evaluations,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific evaluation by ID
   */
  async getById(req, res, next) {
    try {
      const evaluation = await evaluationsService.getEvaluationById(req.params.id);
      res.json({
        success: true,
        data: evaluation
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Start an evaluation
   */
  async start(req, res, next) {
    try {
      const evaluation = await evaluationsService.startEvaluation(req.params.id, req.user.id);
      res.json({
        success: true,
        data: evaluation,
        message: 'Evaluation started successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get evaluation results
   */
  async getResults(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 50;
      
      const result = await evaluationsService.getEvaluationResults(req.params.id, page, pageSize);
      
      res.json({
        success: true,
        data: result.results,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete an evaluation
   */
  async delete(req, res, next) {
    try {
      const result = await evaluationsService.deleteEvaluation(req.params.id, req.user.id);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get evaluation statistics/summary
   */
  async getStats(req, res, next) {
    try {
      const evaluation = await evaluationsService.getEvaluationById(req.params.id);
      
      // Use stored accuracy data from database instead of recalculating
      const stats = {
        totalMessages: evaluation.total_messages,
        processedMessages: evaluation.processed_messages || 0,
        correctPredictions: evaluation.correct_predictions || 0,
        incorrectPredictions: evaluation.incorrect_predictions || 0,
        errorCount: evaluation.error_count || 0,
        accuracy: evaluation.accuracy || 0,
        avgResponseTime: evaluation.total_time_ms / Math.max(evaluation.processed_messages, 1),
        status: evaluation.status
      };
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Stream evaluation progress updates via Server-Sent Events
   */
  async streamProgress(req, res, next) {
    try {
      const evaluationId = parseInt(req.params.id);
      
      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Send initial evaluation state
      const evaluation = await evaluationsService.getEvaluationById(evaluationId);
      res.write(`data: ${JSON.stringify({ type: 'evaluation', data: evaluation })}\n\n`);
      
      // Add this connection to the SSE manager
      sseManager.addConnection(evaluationId, res);
      
      // If evaluation is already completed/failed, close the connection
      if (evaluation.status === 'completed' || evaluation.status === 'failed') {
        res.write(`data: ${JSON.stringify({ type: 'complete', data: evaluation })}\n\n`);
        res.end();
        return;
      }

      logger.info(`SSE connection established for evaluation ${evaluationId}`);

    } catch (error) {
      next(error);
    }
  }

  async updateEvaluationName(req, res, next) {
    try {
      const { id } = req.params;
      const { name } = req.body;
      
      if (!id || isNaN(parseInt(id))) {
        throw new AppError('Valid evaluation ID is required', 400);
      }
      
      if (!name || name.trim() === '') {
        throw new AppError('Evaluation name is required', 400);
      }
      
      const evaluation = await evaluationsService.updateEvaluationName(
        parseInt(id),
        name.trim(),
        req.user.id
      );
      
      res.json({
        message: 'Evaluation name updated successfully',
        evaluation
      });
    } catch (error) {
      next(error);
    }
  }

  async validateStatus(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        throw new AppError('Valid evaluation ID is required', 400);
      }
      
      const statusInfo = await evaluationsService.validateEvaluationStatus(
        parseInt(id),
        req.user.id
      );
      
      res.json(statusInfo);
    } catch (error) {
      next(error);
    }
  }

  async stopEvaluation(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        throw new AppError('Valid evaluation ID is required', 400);
      }
      
      const result = await evaluationsService.stopEvaluation(
        parseInt(id),
        req.user.id
      );
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async resetEvaluation(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        throw new AppError('Valid evaluation ID is required', 400);
      }
      
      const result = await evaluationsService.resetEvaluation(
        parseInt(id),
        req.user.id
      );
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async resumeEvaluation(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        throw new AppError('Valid evaluation ID is required', 400);
      }
      
      const evaluation = await evaluationsService.resumeEvaluation(
        parseInt(id),
        req.user.id
      );
      
      res.json({
        success: true,
        data: evaluation,
        message: 'Evaluation resumed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async retryErrors(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        throw new AppError('Valid evaluation ID is required', 400);
      }
      
      const evaluation = await evaluationsService.retryErrors(
        parseInt(id),
        req.user.id
      );
      
      res.json({
        success: true,
        data: evaluation,
        message: 'Error retry started successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async rerunEvaluation(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        throw new AppError('Valid evaluation ID is required', 400);
      }
      
      const newEvaluation = await evaluationsService.rerunEvaluation(
        parseInt(id),
        req.user.id
      );
      
      res.json({
        success: true,
        data: newEvaluation,
        message: 'Evaluation rerun started successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new EvaluationsController();