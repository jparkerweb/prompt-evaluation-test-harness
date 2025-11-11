import datasetsService from './datasets.service.js';
import { AppError } from '../../middleware/errorHandler.js';
import JSONLParser from '../../services/jsonl.js';

class DatasetsController {
  async createDataset(req, res, next) {
    try {
      const { name } = req.body;
      const file = req.file;
      
      if (!name || name.trim() === '') {
        throw new AppError('Dataset name is required', 400);
      }
      
      if (!file) {
        throw new AppError('JSONL file is required', 400);
      }
      
      // Validate file
      JSONLParser.validateFileType(file);
      JSONLParser.validateFileSize(file, parseInt(process.env.MAX_FILE_SIZE_MB) || 50);
      
      // Convert buffer to string
      const content = file.buffer.toString('utf-8');
      
      const dataset = await datasetsService.createDataset(
        name.trim(),
        content,
        req.user.id
      );
      
      res.status(201).json({
        message: 'Dataset created successfully',
        dataset
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getDatasets(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || parseInt(process.env.DEFAULT_PAGE_SIZE) || 50;
      const sortBy = req.query.sortBy || 'created_at';
      const sortDirection = req.query.sortDirection || 'desc';
      
      // Filter parameters
      const filters = {
        creator: req.query.creator,
        message_count_min: req.query.message_count_min ? parseInt(req.query.message_count_min) : undefined,
        message_count_max: req.query.message_count_max ? parseInt(req.query.message_count_max) : undefined,
        created_at_from: req.query.created_at_from,
        created_at_to: req.query.created_at_to
      };
      
      if (page < 1) {
        throw new AppError('Page must be greater than 0', 400);
      }
      
      if (pageSize < 1 || pageSize > (parseInt(process.env.MAX_PAGE_SIZE) || 100)) {
        throw new AppError(`Page size must be between 1 and ${process.env.MAX_PAGE_SIZE || 100}`, 400);
      }
      
      // Validate sort fields
      const validSortFields = ['name', 'created_at', 'message_count', 'created_by_username'];
      if (!validSortFields.includes(sortBy)) {
        throw new AppError('Invalid sort field', 400);
      }
      
      if (!['asc', 'desc'].includes(sortDirection)) {
        throw new AppError('Invalid sort direction', 400);
      }
      
      const result = await datasetsService.getDatasets(page, pageSize, sortBy, sortDirection, filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
  
  async getDatasetById(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        throw new AppError('Valid dataset ID is required', 400);
      }
      
      const dataset = await datasetsService.getDatasetById(parseInt(id));
      res.json(dataset);
    } catch (error) {
      next(error);
    }
  }
  
  async getDatasetMessages(req, res, next) {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || parseInt(process.env.DEFAULT_PAGE_SIZE) || 50;
      
      if (!id || isNaN(parseInt(id))) {
        throw new AppError('Valid dataset ID is required', 400);
      }
      
      if (page < 1) {
        throw new AppError('Page must be greater than 0', 400);
      }
      
      if (pageSize < 1 || pageSize > (parseInt(process.env.MAX_PAGE_SIZE) || 100)) {
        throw new AppError(`Page size must be between 1 and ${process.env.MAX_PAGE_SIZE || 100}`, 400);
      }
      
      const result = await datasetsService.getDatasetMessages(parseInt(id), page, pageSize);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
  
  async updateDatasetName(req, res, next) {
    try {
      const { id } = req.params;
      const { name } = req.body;
      
      if (!id || isNaN(parseInt(id))) {
        throw new AppError('Valid dataset ID is required', 400);
      }
      
      if (!name || name.trim() === '') {
        throw new AppError('Dataset name is required', 400);
      }
      
      const dataset = await datasetsService.updateDatasetName(
        parseInt(id), 
        name.trim(), 
        req.user.id
      );
      
      res.json({
        message: 'Dataset name updated successfully',
        dataset
      });
    } catch (error) {
      next(error);
    }
  }
  
  async deleteDataset(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        throw new AppError('Valid dataset ID is required', 400);
      }
      
      const result = await datasetsService.deleteDataset(parseInt(id), req.user.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
  
  async getStats(req, res, next) {
    try {
      const stats = await datasetsService.getDatasetStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
  
  async createDatasetMessage(req, res, next) {
    try {
      const { id } = req.params;
      const { label, messageContent } = req.body;
      
      if (!id || isNaN(parseInt(id))) {
        throw new AppError('Valid dataset ID is required', 400);
      }
      
      if (label === undefined || label === null) {
        throw new AppError('Label is required', 400);
      }
      
      if (!messageContent || messageContent.trim().length === 0) {
        throw new AppError('Message content is required and must have at least one character', 400);
      }
      
      const message = await datasetsService.createDatasetMessage(
        parseInt(id),
        Boolean(label),
        messageContent.trim()
      );
      
      res.status(201).json({
        message: 'Message created successfully',
        data: message
      });
    } catch (error) {
      next(error);
    }
  }
  
  async updateDatasetMessage(req, res, next) {
    try {
      const { datasetId, messageId } = req.params;
      const { label, messageContent } = req.body;
      
      if (!datasetId || isNaN(parseInt(datasetId))) {
        throw new AppError('Valid dataset ID is required', 400);
      }
      
      if (!messageId || isNaN(parseInt(messageId))) {
        throw new AppError('Valid message ID is required', 400);
      }
      
      if (label === undefined || label === null) {
        throw new AppError('Label is required', 400);
      }
      
      if (!messageContent || messageContent.trim().length === 0) {
        throw new AppError('Message content is required and must have at least one character', 400);
      }
      
      const message = await datasetsService.updateDatasetMessage(
        parseInt(datasetId),
        parseInt(messageId),
        Boolean(label),
        messageContent.trim()
      );
      
      res.json({
        message: 'Message updated successfully',
        data: message
      });
    } catch (error) {
      next(error);
    }
  }
  
  async deleteDatasetMessage(req, res, next) {
    try {
      const { datasetId, messageId } = req.params;
      
      if (!datasetId || isNaN(parseInt(datasetId))) {
        throw new AppError('Valid dataset ID is required', 400);
      }
      
      if (!messageId || isNaN(parseInt(messageId))) {
        throw new AppError('Valid message ID is required', 400);
      }
      
      await datasetsService.deleteDatasetMessage(
        parseInt(datasetId),
        parseInt(messageId),
        req.user.id
      );
      
      res.json({
        message: 'Message deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
  
  async createBlankDataset(req, res, next) {
    try {
      const { name } = req.body;
      
      if (!name || name.trim() === '') {
        throw new AppError('Dataset name is required', 400);
      }
      
      const dataset = await datasetsService.createBlankDataset(
        name.trim(),
        req.user.id
      );
      
      res.status(201).json({
        message: 'Blank dataset created successfully',
        dataset
      });
    } catch (error) {
      next(error);
    }
  }
  
  async addMessagesToDataset(req, res, next) {
    try {
      const { id } = req.params;
      const file = req.file;
      
      if (!id || isNaN(parseInt(id))) {
        throw new AppError('Valid dataset ID is required', 400);
      }
      
      if (!file) {
        throw new AppError('JSONL file is required', 400);
      }
      
      // Validate file
      JSONLParser.validateFileType(file);
      JSONLParser.validateFileSize(file, parseInt(process.env.MAX_FILE_SIZE_MB) || 50);
      
      // Convert buffer to string
      const content = file.buffer.toString('utf-8');
      
      const result = await datasetsService.addMessagesToDataset(
        parseInt(id),
        content
      );
      
      res.status(201).json({
        message: `${result.addedMessages} messages added successfully`,
        result
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new DatasetsController();