import { getDatabase } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';

class PromptsService {
  /**
   * Create a new prompt
   */
  async createPrompt(promptData, userId) {
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
    } = promptData;

    // Validate required fields
    if (!name || !modelId || !promptText || !openingTag || !closingTag) {
      throw new AppError('name, modelId, promptText, openingTag, and closingTag are required', 400);
    }

    // Validate numeric ranges
    if (maxTokens !== null && maxTokens !== undefined && (maxTokens < 1 || maxTokens > 200000)) {
      throw new AppError('maxTokens must be between 1 and 200000', 400);
    }

    if (temperature !== null && temperature !== undefined && (temperature < 0 || temperature > 2)) {
      throw new AppError('temperature must be between 0 and 2', 400);
    }

    if (topP !== null && topP !== undefined && (topP < 0 || topP > 1)) {
      throw new AppError('topP must be between 0 and 1', 400);
    }

    // Validate parent prompt exists if specified
    if (parentPromptId) {
      const parentPrompt = await this.getPromptById(parentPromptId);
      if (!parentPrompt) {
        throw new AppError('Parent prompt not found', 404);
      }
    }

    const db = getDatabase();
    
    try {
      const result = await new Promise((resolve, reject) => {
        const stmt = db.prepare(`
          INSERT INTO prompts (
            name, modelId, promptText, maxTokens, temperature, topP, 
            stopSequences, openingTag, closingTag, parent_prompt_id, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
          name,
          modelId,
          promptText,
          maxTokens,
          temperature,
          topP,
          stopSequences ? JSON.stringify(stopSequences) : null,
          openingTag,
          closingTag,
          parentPromptId || null,
          userId,
          function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID });
          }
        );
        
        stmt.finalize();
      });

      logger.info(`Created prompt with ID: ${result.id}`);
      return await this.getPromptById(result.id);
    } catch (error) {
      logger.error('Failed to create prompt:', error);
      throw new AppError('Failed to create prompt', 500);
    }
  }

  /**
   * Get prompts with pagination, sorting, and filtering
   */
  async getPrompts(page = 1, pageSize = 50, sortBy = 'created_at', sortDirection = 'desc', filters = {}) {
    const limit = Math.min(pageSize, process.env.MAX_PAGE_SIZE || 100);
    const offset = (page - 1) * limit;
    const db = getDatabase();

    try {
      // Build WHERE clause based on filters
      let whereClause = '1=1';
      let queryParams = [];
      
      if (filters.creator) {
        whereClause += ' AND u.username = ?';
        queryParams.push(filters.creator);
      }
      
      if (filters.model) {
        whereClause += ' AND p.modelId = ?';
        queryParams.push(filters.model);
      }
      
      if (filters.is_copy !== undefined && filters.is_copy !== '') {
        if (filters.is_copy === 'true') {
          whereClause += ' AND p.parent_prompt_id IS NOT NULL';
        } else {
          whereClause += ' AND p.parent_prompt_id IS NULL';
        }
      }
      
      if (filters.parent_prompt) {
        whereClause += ' AND parent.name = ?';
        queryParams.push(filters.parent_prompt);
      }
      
      if (filters.created_at_from) {
        whereClause += ' AND DATE(p.created_at) >= ?';
        queryParams.push(filters.created_at_from);
      }
      
      if (filters.created_at_to) {
        whereClause += ' AND DATE(p.created_at) <= ?';
        queryParams.push(filters.created_at_to);
      }

      // Build ORDER BY clause
      const sortColumn = sortBy === 'created_by_username' ? 'u.username' : `p.${sortBy}`;
      const orderBy = `${sortColumn} ${sortDirection.toUpperCase()}`;

      // Get total count with filters
      const countResult = await new Promise((resolve, reject) => {
        db.get(`
          SELECT COUNT(*) as total 
          FROM prompts p
          LEFT JOIN users u ON p.created_by = u.id
          LEFT JOIN prompts parent ON p.parent_prompt_id = parent.id
          WHERE ${whereClause}
        `, queryParams, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      // Get prompts with user information and evaluation reference check
      const prompts = await new Promise((resolve, reject) => {
        db.all(`
          SELECT 
            p.*,
            u.username as created_by_username,
            parent.name as parent_prompt_name,
            CASE WHEN e.prompt_id IS NOT NULL THEN 1 ELSE 0 END as is_referenced_in_evaluations
          FROM prompts p
          LEFT JOIN users u ON p.created_by = u.id
          LEFT JOIN prompts parent ON p.parent_prompt_id = parent.id
          LEFT JOIN (
            SELECT DISTINCT prompt_id 
            FROM evaluations
          ) e ON p.id = e.prompt_id
          WHERE ${whereClause}
          ORDER BY ${orderBy}
          LIMIT ? OFFSET ?
        `, [...queryParams, limit, offset], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // Parse stopSequences JSON
      const processedPrompts = prompts.map(prompt => ({
        ...prompt,
        stopSequences: prompt.stopSequences ? JSON.parse(prompt.stopSequences) : null
      }));

      const total = countResult.total;
      const totalPages = Math.ceil(total / pageSize);

      return {
        prompts: processedPrompts,
        pagination: {
          page,
          pageSize,
          total,
          totalPages
        }
      };
    } catch (error) {
      logger.error('Failed to fetch prompts:', error);
      throw new AppError('Failed to fetch prompts', 500);
    }
  }

  /**
   * Get a prompt by ID
   */
  async getPromptById(id) {
    const db = getDatabase();

    try {
      const prompt = await new Promise((resolve, reject) => {
        db.get(`
          SELECT 
            p.*,
            u.username as created_by_username,
            parent.name as parent_prompt_name
          FROM prompts p
          LEFT JOIN users u ON p.created_by = u.id
          LEFT JOIN prompts parent ON p.parent_prompt_id = parent.id
          WHERE p.id = ?
        `, [id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!prompt) {
        throw new AppError('Prompt not found', 404);
      }

      // Parse stopSequences JSON
      return {
        ...prompt,
        stopSequences: prompt.stopSequences ? JSON.parse(prompt.stopSequences) : null
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to fetch prompt:', error);
      throw new AppError('Failed to fetch prompt', 500);
    }
  }

  /**
   * Check if a prompt is referenced in existing evaluations
   */
  async isPromptReferencedInEvaluations(id) {
    const db = getDatabase();
    
    try {
      const result = await new Promise((resolve, reject) => {
        db.get(
          'SELECT COUNT(*) as count FROM evaluations WHERE prompt_id = ?',
          [id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row.count);
          }
        );
      });
      
      return result > 0;
    } catch (error) {
      logger.error('Failed to check prompt references:', error);
      throw new AppError('Failed to check prompt references', 500);
    }
  }

  /**
   * Update a prompt
   */
  async updatePrompt(id, promptData, userId) {
    const existingPrompt = await this.getPromptById(id);
    
    // Check if user has permission to update
    if (existingPrompt.created_by !== userId) {
      throw new AppError('Not authorized to update this prompt', 403);
    }

    // Check if prompt is referenced in existing evaluations
    const isReferenced = await this.isPromptReferencedInEvaluations(id);
    if (isReferenced) {
      throw new AppError('Cannot edit prompt that is referenced in existing evaluations', 400);
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
    } = promptData;

    // Validate fields if provided
    if (maxTokens !== null && maxTokens !== undefined && (maxTokens < 1 || maxTokens > 200000)) {
      throw new AppError('maxTokens must be between 1 and 200000', 400);
    }

    if (temperature !== null && temperature !== undefined && (temperature < 0 || temperature > 2)) {
      throw new AppError('temperature must be between 0 and 2', 400);
    }

    if (topP !== null && topP !== undefined && (topP < 0 || topP > 1)) {
      throw new AppError('topP must be between 0 and 1', 400);
    }

    // Validate parent prompt exists if specified
    if (parentPromptId && parentPromptId !== existingPrompt.parent_prompt_id) {
      const parentPrompt = await this.getPromptById(parentPromptId);
      if (!parentPrompt) {
        throw new AppError('Parent prompt not found', 404);
      }
    }

    const db = getDatabase();

    try {
      await new Promise((resolve, reject) => {
        const stmt = db.prepare(`
          UPDATE prompts SET
            name = COALESCE(?, name),
            modelId = COALESCE(?, modelId),
            promptText = COALESCE(?, promptText),
            maxTokens = CASE WHEN ? IS NULL THEN maxTokens ELSE ? END,
            temperature = CASE WHEN ? IS NULL THEN temperature ELSE ? END,
            topP = CASE WHEN ? IS NULL THEN topP ELSE ? END,
            stopSequences = CASE WHEN ? IS NULL THEN stopSequences ELSE ? END,
            openingTag = COALESCE(?, openingTag),
            closingTag = COALESCE(?, closingTag),
            parent_prompt_id = CASE WHEN ? IS NULL THEN parent_prompt_id ELSE ? END
          WHERE id = ?
        `);
        
        stmt.run(
          name || null,
          modelId || null,
          promptText || null,
          maxTokens === undefined ? null : maxTokens,
          maxTokens === undefined ? null : maxTokens,
          temperature === undefined ? null : temperature,
          temperature === undefined ? null : temperature,
          topP === undefined ? null : topP,
          topP === undefined ? null : topP,
          stopSequences === undefined ? null : (stopSequences ? JSON.stringify(stopSequences) : null),
          stopSequences === undefined ? null : (stopSequences ? JSON.stringify(stopSequences) : null),
          openingTag || null,
          closingTag || null,
          parentPromptId === undefined ? null : parentPromptId,
          parentPromptId === undefined ? null : parentPromptId,
          id,
          function(err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
          }
        );
        
        stmt.finalize();
      });

      logger.info(`Updated prompt with ID: ${id}`);
      return await this.getPromptById(id);
    } catch (error) {
      logger.error('Failed to update prompt:', error);
      throw new AppError('Failed to update prompt', 500);
    }
  }

  /**
   * Update prompt name
   */
  async updatePromptName(id, name, userId) {
    const prompt = await this.getPromptById(id);
    
    // Check if user owns the prompt
    if (prompt.created_by !== userId) {
      throw new AppError('You can only edit prompts you created', 403);
    }
    
    const db = getDatabase();
    
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE prompts SET name = ? WHERE id = ?',
        [name, id],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
    
    return this.getPromptById(id);
  }

  /**
   * Delete a prompt (hard delete)
   */
  async deletePrompt(id, userId) {
    const existingPrompt = await this.getPromptById(id);
    
    // Check if user has permission to delete
    if (existingPrompt.created_by !== userId) {
      throw new AppError('Not authorized to delete this prompt', 403);
    }

    // Check if prompt is referenced in existing evaluations
    const isReferenced = await this.isPromptReferencedInEvaluations(id);
    if (isReferenced) {
      throw new AppError('Cannot delete prompt that is referenced in existing evaluations', 400);
    }

    // Check if prompt has child prompts
    const db = getDatabase();
    const childCount = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM prompts WHERE parent_prompt_id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    if (childCount > 0) {
      throw new AppError('Cannot delete prompt with child prompts', 400);
    }

    try {
      await new Promise((resolve, reject) => {
        const stmt = db.prepare('DELETE FROM prompts WHERE id = ?');
        stmt.run(id, function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        });
        stmt.finalize();
      });

      logger.info(`Deleted prompt with ID: ${id}`);
      return { message: 'Prompt deleted successfully' };
    } catch (error) {
      logger.error('Failed to delete prompt:', error);
      throw new AppError('Failed to delete prompt', 500);
    }
  }

  /**
   * Get prompt statistics
   */
  async getPromptStats() {
    const db = getDatabase();

    try {
      const stats = await new Promise((resolve, reject) => {
        db.get(`
          SELECT 
            COUNT(*) as totalPrompts,
            COUNT(DISTINCT created_by) as totalCreators,
            COUNT(CASE WHEN parent_prompt_id IS NOT NULL THEN 1 END) as totalVersions
          FROM prompts 
          WHERE 1=1
        `, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      return {
        totalPrompts: stats.totalPrompts || 0,
        totalCreators: stats.totalCreators || 0,
        totalVersions: stats.totalVersions || 0
      };
    } catch (error) {
      logger.error('Failed to fetch prompt stats:', error);
      throw new AppError('Failed to fetch prompt stats', 500);
    }
  }

  /**
   * Get prompt versions (children of a prompt)
   */
  async getPromptVersions(parentId) {
    const db = getDatabase();

    try {
      const versions = await new Promise((resolve, reject) => {
        db.all(`
          SELECT 
            p.*,
            u.username as created_by_username
          FROM prompts p
          LEFT JOIN users u ON p.created_by = u.id
          WHERE p.parent_prompt_id = ?
          ORDER BY p.created_at DESC
        `, [parentId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // Parse stopSequences JSON
      return versions.map(prompt => ({
        ...prompt,
        stopSequences: prompt.stopSequences ? JSON.parse(prompt.stopSequences) : null
      }));
    } catch (error) {
      logger.error('Failed to fetch prompt versions:', error);
      throw new AppError('Failed to fetch prompt versions', 500);
    }
  }
}

export default new PromptsService();