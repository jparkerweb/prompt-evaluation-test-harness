import promptsService from './prompts.service.js';
import { AppError } from '../../middleware/errorHandler.js';

class PromptsController {
  async createPrompt(req, res, next) {
    try {
      const {
        name,
        modelId,
        promptText,
        maxTokens,
        temperature,
        topP,
        stopSequences,
        openingTag,
        closingTag,
        parentPromptId
      } = req.body;
      
      if (!name || !modelId || !promptText || !openingTag || !closingTag) {
        throw new AppError('name, modelId, promptText, openingTag, and closingTag are required', 400);
      }
      
      const promptData = {
        name: name.trim(),
        modelId: modelId.trim(),
        promptText: promptText.trim(),
        maxTokens: maxTokens ? parseInt(maxTokens) : null,
        temperature: temperature ? parseFloat(temperature) : null,
        topP: topP ? parseFloat(topP) : null,
        stopSequences: stopSequences || null,
        openingTag: openingTag.trim(),
        closingTag: closingTag.trim(),
        parentPromptId: parentPromptId ? parseInt(parentPromptId) : null
      };
      
      const prompt = await promptsService.createPrompt(promptData, req.user.id);
      
      res.status(201).json({
        message: 'Prompt created successfully',
        prompt
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getPrompts(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || parseInt(process.env.DEFAULT_PAGE_SIZE) || 50;
      const sortBy = req.query.sortBy || 'created_at';
      const sortDirection = req.query.sortDirection || 'desc';
      
      if (page < 1) {
        throw new AppError('Page must be greater than 0', 400);
      }
      
      if (pageSize < 1 || pageSize > (parseInt(process.env.MAX_PAGE_SIZE) || 100)) {
        throw new AppError(`Page size must be between 1 and ${process.env.MAX_PAGE_SIZE || 100}`, 400);
      }

      // Filter parameters
      const filters = {
        creator: req.query.creator,
        model: req.query.model,
        is_copy: req.query.is_copy,
        parent_prompt: req.query.parent_prompt,
        created_at_from: req.query.created_at_from,
        created_at_to: req.query.created_at_to
      };
      
      const result = await promptsService.getPrompts(page, pageSize, sortBy, sortDirection, filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
  
  async getPromptById(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        throw new AppError('Valid prompt ID is required', 400);
      }
      
      const prompt = await promptsService.getPromptById(parseInt(id));
      res.json(prompt);
    } catch (error) {
      next(error);
    }
  }
  
  async updatePrompt(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        throw new AppError('Valid prompt ID is required', 400);
      }
      
      const {
        name,
        modelId,
        promptText,
        maxTokens,
        temperature,
        topP,
        stopSequences,
        openingTag,
        closingTag,
        parentPromptId
      } = req.body;
      
      const promptData = {};
      
      if (name !== undefined) promptData.name = name.trim();
      if (modelId !== undefined) promptData.modelId = modelId.trim();
      if (promptText !== undefined) promptData.promptText = promptText.trim();
      if (maxTokens !== undefined) promptData.maxTokens = maxTokens ? parseInt(maxTokens) : null;
      if (temperature !== undefined) promptData.temperature = temperature ? parseFloat(temperature) : null;
      if (topP !== undefined) promptData.topP = topP ? parseFloat(topP) : null;
      if (stopSequences !== undefined) promptData.stopSequences = stopSequences;
      if (openingTag !== undefined) promptData.openingTag = openingTag.trim();
      if (closingTag !== undefined) promptData.closingTag = closingTag.trim();
      if (parentPromptId !== undefined) promptData.parentPromptId = parentPromptId ? parseInt(parentPromptId) : null;
      
      const prompt = await promptsService.updatePrompt(parseInt(id), promptData, req.user.id);
      
      res.json({
        message: 'Prompt updated successfully',
        prompt
      });
    } catch (error) {
      next(error);
    }
  }
  
  async updatePromptName(req, res, next) {
    try {
      const { id } = req.params;
      const { name } = req.body;
      
      if (!id || isNaN(parseInt(id))) {
        throw new AppError('Valid prompt ID is required', 400);
      }
      
      if (!name || name.trim() === '') {
        throw new AppError('Prompt name is required', 400);
      }
      
      const prompt = await promptsService.updatePromptName(
        parseInt(id),
        name.trim(),
        req.user.id
      );
      
      res.json({
        message: 'Prompt name updated successfully',
        prompt
      });
    } catch (error) {
      next(error);
    }
  }
  
  async deletePrompt(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        throw new AppError('Valid prompt ID is required', 400);
      }
      
      const result = await promptsService.deletePrompt(parseInt(id), req.user.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
  
  async getStats(req, res, next) {
    try {
      const stats = await promptsService.getPromptStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
  
  async getPromptVersions(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        throw new AppError('Valid prompt ID is required', 400);
      }
      
      const versions = await promptsService.getPromptVersions(parseInt(id));
      res.json({
        versions
      });
    } catch (error) {
      next(error);
    }
  }

  async checkPromptEditable(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        throw new AppError('Valid prompt ID is required', 400);
      }
      
      const isReferenced = await promptsService.isPromptReferencedInEvaluations(parseInt(id));
      res.json({
        canEdit: !isReferenced,
        isReferencedInEvaluations: isReferenced
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PromptsController();