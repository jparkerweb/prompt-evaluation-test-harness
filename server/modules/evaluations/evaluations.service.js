import { getDatabase } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';
import bedrockService from '../../services/bedrock.service.js';
import promptsService from '../prompts/prompts.service.js';
import datasetsService from '../datasets/datasets.service.js';
import sseManager from '../../services/sseManager.js';
import dbQueue from '../../utils/dbQueue.js';

class EvaluationsService {
  constructor() {
    // Track when the last LLM error occurred to implement error delay
    this.lastLLMErrorTime = null;
    this.llmErrorDelayMs = parseInt(process.env.LLM_ERROR_DELAY_MS) || 5000;
  }

  /**
   * Check if we're in an LLM error delay period and wait if necessary
   */
  async checkLLMErrorDelay() {
    if (this.lastLLMErrorTime) {
      const timeSinceError = Date.now() - this.lastLLMErrorTime;
      if (timeSinceError < this.llmErrorDelayMs) {
        const remainingDelay = this.llmErrorDelayMs - timeSinceError;
        logger.info(`LLM error delay: waiting ${remainingDelay}ms since last LLM error`);
        await new Promise(resolve => setTimeout(resolve, remainingDelay));
      }
    }
  }

  /**
   * Record that an LLM error occurred
   */
  recordLLMError() {
    this.lastLLMErrorTime = Date.now();
    logger.info(`LLM error recorded, future LLM calls will be delayed by ${this.llmErrorDelayMs}ms`);
  }

  /**
   * Create a new evaluation
   */
  async createEvaluation(evaluationData, userId) {
    const { name, description, promptId, datasetId } = evaluationData;

    // Validate required fields
    if (!name || !promptId || !datasetId) {
      throw new AppError('name, promptId, and datasetId are required', 400);
    }

    // Validate that prompt and dataset exist
    const prompt = await promptsService.getPromptById(promptId);
    const dataset = await datasetsService.getDatasetById(datasetId);

    if (!prompt) {
      throw new AppError('Prompt not found', 404);
    }
    
    if (!dataset) {
      throw new AppError('Dataset not found', 404);
    }

    // Get dataset message count
    const messageCount = await this.getDatasetMessageCount(datasetId);

    const db = getDatabase();
    
    try {
      const result = await new Promise((resolve, reject) => {
        const stmt = db.prepare(`
          INSERT INTO evaluations (
            name, description, prompt_id, dataset_id, 
            total_messages, created_by
          ) VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
          name,
          description || null,
          promptId,
          datasetId,
          messageCount,
          userId,
          function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID });
          }
        );
        
        stmt.finalize();
      });

      logger.info(`Created evaluation with ID: ${result.id}`);
      return await this.getEvaluationById(result.id);
    } catch (error) {
      logger.error('Failed to create evaluation:', error);
      throw new AppError('Failed to create evaluation', 500);
    }
  }

  /**
   * Get evaluations with pagination, sorting, and filtering
   */
  async getEvaluations(page = 1, pageSize = 50, sortBy = 'created_at', sortDirection = 'desc', filters = {}) {
    const limit = Math.min(pageSize, process.env.MAX_PAGE_SIZE || 100);
    const offset = (page - 1) * limit;
    const db = getDatabase();

    try {
      // Build WHERE clause based on filters
      let whereClause = '1=1';
      let queryParams = [];
      
      if (filters.status) {
        whereClause += ' AND e.status = ?';
        queryParams.push(filters.status);
      }
      
      if (filters.prompt) {
        whereClause += ' AND p.name = ?';
        queryParams.push(filters.prompt);
      }
      
      if (filters.dataset) {
        whereClause += ' AND d.name = ?';
        queryParams.push(filters.dataset);
      }
      
      if (filters.model) {
        whereClause += ' AND p.modelId = ?';
        queryParams.push(filters.model);
      }
      
      if (filters.creator) {
        whereClause += ' AND u.username = ?';
        queryParams.push(filters.creator);
      }
      
      if (filters.accuracy_min) {
        whereClause += ' AND e.accuracy >= ?';
        queryParams.push(filters.accuracy_min);
      }
      
      if (filters.accuracy_max) {
        whereClause += ' AND e.accuracy <= ?';
        queryParams.push(filters.accuracy_max);
      }
      
      if (filters.processing_time_min) {
        whereClause += ' AND (e.total_time_ms / 1000) >= ?';
        queryParams.push(filters.processing_time_min);
      }
      
      if (filters.processing_time_max) {
        whereClause += ' AND (e.total_time_ms / 1000) <= ?';
        queryParams.push(filters.processing_time_max);
      }
      
      if (filters.created_at_from) {
        whereClause += ' AND DATE(e.created_at) >= ?';
        queryParams.push(filters.created_at_from);
      }
      
      if (filters.created_at_to) {
        whereClause += ' AND DATE(e.created_at) <= ?';
        queryParams.push(filters.created_at_to);
      }

      // Build ORDER BY clause
      let sortColumn;
      switch (sortBy) {
        case 'created_by_username':
          sortColumn = 'u.username';
          break;
        case 'prompt_name':
          sortColumn = 'p.name';
          break;
        case 'dataset_name':
          sortColumn = 'd.name';
          break;
        case 'model_id':
          sortColumn = 'p.modelId';
          break;
        case 'avg_time_per_message':
          // Calculate average time per message, handle division by zero
          sortColumn = 'CASE WHEN e.processed_messages > 0 THEN e.total_time_ms / e.processed_messages ELSE 0 END';
          break;
        default:
          sortColumn = `e.${sortBy}`;
      }
      const orderBy = `${sortColumn} ${sortDirection.toUpperCase()}`;

      // Get total count with filters
      const countResult = await new Promise((resolve, reject) => {
        db.get(`
          SELECT COUNT(*) as total 
          FROM evaluations e
          LEFT JOIN users u ON e.created_by = u.id
          LEFT JOIN prompts p ON e.prompt_id = p.id
          LEFT JOIN datasets d ON e.dataset_id = d.id
          WHERE ${whereClause}
        `, queryParams, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      // Get evaluations with related data
      const evaluations = await new Promise((resolve, reject) => {
        db.all(`
          SELECT 
            e.*,
            u.username as created_by_username,
            p.name as prompt_name,
            p.modelId as model_id,
            d.name as dataset_name
          FROM evaluations e
          LEFT JOIN users u ON e.created_by = u.id
          LEFT JOIN prompts p ON e.prompt_id = p.id
          LEFT JOIN datasets d ON e.dataset_id = d.id
          WHERE ${whereClause}
          ORDER BY ${orderBy}
          LIMIT ? OFFSET ?
        `, [...queryParams, limit, offset], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      const total = countResult.total;
      const totalPages = Math.ceil(total / pageSize);

      return {
        evaluations,
        pagination: {
          page,
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to fetch evaluations:', error);
      throw new AppError('Failed to fetch evaluations', 500);
    }
  }

  /**
   * Get an evaluation by ID
   */
  async getEvaluationById(id) {
    const db = getDatabase();

    try {
      const evaluation = await new Promise((resolve, reject) => {
        db.get(`
          SELECT 
            e.*,
            u.username as created_by_username,
            p.name as prompt_name,
            p.modelId as model_id,
            p.promptText as prompt_text,
            p.maxTokens as prompt_max_tokens,
            p.temperature as prompt_temperature,
            p.topP as prompt_top_p,
            p.stopSequences as prompt_stop_sequences,
            p.openingTag as prompt_opening_tag,
        p.closingTag as prompt_closing_tag,
            p.parent_prompt_id as prompt_parent_id,
            parent_p.name as prompt_parent_name,
            d.name as dataset_name
          FROM evaluations e
          LEFT JOIN users u ON e.created_by = u.id
          LEFT JOIN prompts p ON e.prompt_id = p.id
          LEFT JOIN prompts parent_p ON p.parent_prompt_id = parent_p.id
          LEFT JOIN datasets d ON e.dataset_id = d.id
          WHERE e.id = ?
        `, [id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!evaluation) {
        throw new AppError('Evaluation not found', 404);
      }

      // Parse stopSequences JSON if it exists
      if (evaluation.prompt_stop_sequences) {
        try {
          evaluation.prompt_stop_sequences = JSON.parse(evaluation.prompt_stop_sequences);
          logger.debug(`Parsed stop sequences for evaluation ${id}:`, evaluation.prompt_stop_sequences);
        } catch (error) {
          logger.error('Failed to parse prompt stopSequences:', error);
          evaluation.prompt_stop_sequences = null;
        }
      } else {
        logger.debug(`No stop sequences found for evaluation ${id}`);
      }

      return evaluation;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to fetch evaluation:', error);
      throw new AppError('Failed to fetch evaluation', 500);
    }
  }

  /**
   * Start running an evaluation
   */
  async startEvaluation(id, userId, resumeMode = false) {
    const evaluation = await this.getEvaluationById(id);
    
    // Check permissions
    if (evaluation.created_by !== userId) {
      throw new AppError('Not authorized to start this evaluation', 403);
    }

    // Check if evaluation can be started
    if (!resumeMode && evaluation.status !== 'pending') {
      throw new AppError(`Evaluation is already ${evaluation.status}`, 400);
    }

    if (resumeMode && !evaluation.can_resume) {
      throw new AppError('This evaluation cannot be resumed', 400);
    }

    const now = new Date().toISOString();
    const serverStartTime = process.env.SERVER_START_TIME || now;
    
    // Calculate timeout (2 hours default)
    const timeoutHours = parseInt(process.env.EVALUATION_TIMEOUT_HOURS) || 2;
    const timeoutAt = new Date(Date.now() + timeoutHours * 60 * 60 * 1000).toISOString();

    // Update status to running with additional tracking fields
    const updateData = {
      started_at: resumeMode ? evaluation.started_at : now,
      last_heartbeat: now,
      timeout_at: timeoutAt,
      server_start_time: serverStartTime,
      can_resume: 0,
      failure_reason: null
    };

    await this.updateEvaluationStatus(id, 'running', updateData);

    // Start the evaluation process asynchronously
    this.runEvaluationAsync(id, resumeMode).catch(error => {
      logger.error(`Async evaluation ${id} failed:`, error);
      this.updateEvaluationStatus(id, 'failed', { 
        completed_at: now,
        can_resume: 1,
        failure_reason: error.message || 'Unexpected error during evaluation'
      });
    });

    return await this.getEvaluationById(id);
  }

  /**
   * Run the evaluation asynchronously
   */
  async runEvaluationAsync(evaluationId, resumeMode = false) {
    const evaluation = await this.getEvaluationById(evaluationId);
    const prompt = await promptsService.getPromptById(evaluation.prompt_id);
    const messages = await this.getDatasetMessages(evaluation.dataset_id);

    logger.info(`${resumeMode ? 'Resuming' : 'Starting'} evaluation ${evaluationId} with ${messages.length} messages`);
    
    // Debug stop sequences from both sources
    logger.debug(`Stop sequences comparison for evaluation ${evaluationId}:`, {
      fromEvaluation: evaluation.prompt_stop_sequences,
      fromPrompt: prompt.stopSequences,
      evaluationType: typeof evaluation.prompt_stop_sequences,
      promptType: typeof prompt.stopSequences
    });

    let processedCount = evaluation.processed_messages || 0;
    let totalTime = evaluation.total_time_ms || 0;

    // In resume mode, skip already processed messages
    let messagesToProcess = messages;
    if (resumeMode && processedCount > 0) {
      // Get list of already processed message IDs
      const db = getDatabase();
      const processedMessageIds = await new Promise((resolve, reject) => {
        db.all(
          'SELECT dataset_message_id FROM evaluation_results WHERE evaluation_id = ?',
          [evaluationId],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(row => row.dataset_message_id));
          }
        );
      });
      
      messagesToProcess = messages.filter(msg => !processedMessageIds.includes(msg.id));
      logger.info(`Resume mode: ${processedCount} messages already processed, ${messagesToProcess.length} remaining`);
    }

    // Get concurrency limit from environment
    const maxConcurrent = parseInt(process.env.MAX_CONCURRENT_LLM_REQUESTS) || 5;
    // Reserve some capacity for frontend requests
    const concurrencyRatio = parseFloat(process.env.EVALUATION_CONCURRENCY_RATIO) || 0.8;
    const effectiveMaxConcurrent = Math.max(1, Math.floor(maxConcurrent * concurrencyRatio));
    const retryAttempts = parseInt(process.env.LLM_REQUEST_RETRY_ATTEMPTS) || 3;
    const retryDelay = parseInt(process.env.LLM_REQUEST_RETRY_DELAY_MS) || 500;
    
    logger.info(`Processing with effective concurrency: ${effectiveMaxConcurrent} (of ${maxConcurrent}), retry attempts: ${retryAttempts}`);

    // Process messages with continuous concurrent slot filling
    const messageQueue = [...messagesToProcess];
    const activePromises = new Map(); // Track active promises by message ID
    let processedInBatch = 0;
    let shouldStop = false;
    let rateLimitBackoffMs = 0;

    // Helper to check if we should stop
    const checkShouldStop = async () => {
      const currentEvaluation = await this.getEvaluationById(evaluationId);
      if (currentEvaluation.status !== 'running') {
        logger.info(`Evaluation ${evaluationId} was stopped, terminating processing`);
        shouldStop = true;
        return true;
      }

      // Check for timeout
      if (currentEvaluation.timeout_at) {
        const timeoutAt = new Date(currentEvaluation.timeout_at);
        if (new Date() > timeoutAt) {
          throw new Error('Evaluation exceeded timeout limit');
        }
      }
      return false;
    };

    // Process messages continuously until queue is empty or stopped
    while ((messageQueue.length > 0 || activePromises.size > 0) && !shouldStop) {
      // Check if we should stop
      if (await checkShouldStop()) break;

      // Fill available slots up to effectiveMaxConcurrent
      while (messageQueue.length > 0 && activePromises.size < effectiveMaxConcurrent && !shouldStop) {
        // Apply rate limit backoff if needed
        if (rateLimitBackoffMs > 0) {
          logger.info(`Rate limit backoff: waiting ${rateLimitBackoffMs}ms before next request`);
          await new Promise(resolve => setTimeout(resolve, rateLimitBackoffMs));
          // Decay backoff for next attempt
          rateLimitBackoffMs = Math.max(0, rateLimitBackoffMs - 100);
        }

        const message = messageQueue.shift();
        
        const processMessage = async () => {
          // Emit LLM call start event
          sseManager.broadcastEvent(parseInt(evaluationId), {
            type: 'llm_call_start',
            messageId: message.id
          });

          let lastError = null;
          let attemptCount = 0;

          // Retry logic
          for (let attempt = 0; attempt < retryAttempts; attempt++) {
            try {
              // Replace placeholder in prompt with actual message content
              const finalPrompt = prompt.promptText.replace('{{messageContent}}', message.messageContent);
              
              // Prepare model parameters - use stop sequences from evaluation (more reliable)
              const stopSequences = evaluation.prompt_stop_sequences || prompt.stopSequences || [];
              const parameters = {
                maxTokens: prompt.maxTokens || 4096,
                temperature: prompt.temperature || 0.7,
                topP: prompt.topP || 0.9,
                stopSequences: stopSequences
              };
              
              logger.debug(`LLM parameters for message ${message.id}:`, {
                maxTokens: parameters.maxTokens,
                temperature: parameters.temperature,
                topP: parameters.topP,
                stopSequences: parameters.stopSequences,
                stopSequencesType: typeof parameters.stopSequences,
                stopSequencesLength: Array.isArray(parameters.stopSequences) ? parameters.stopSequences.length : 'not-array'
              });

              // Check for LLM error delay before making the call
              await this.checkLLMErrorDelay();

              // Call the LLM
              const startTime = Date.now();
              const result = await bedrockService.invokeModel(prompt.modelId, finalPrompt, parameters);
              const responseTime = Date.now() - startTime;
              
              // Extract the label from the response
              let extractedLabel = this.extractLabel(result.content, prompt.openingTag, prompt.closingTag);
              
              // If extraction failed and this is not already a retry for missing tags, do an immediate retry
              if (extractedLabel === null && attempt === 0) {
                logger.info(`Missing tags in response for message ${message.id}, doing immediate retry`);
                continue; // This will trigger the next iteration of the retry loop
              }
              
              // Save the result
              const saveResult = await this.saveEvaluationResult({
                evaluationId,
                datasetMessageId: message.id,
                llmLabel: extractedLabel,
                llmFullResponse: result.content,
                responseTime,
                errorMessage: null,
                retryCount: attempt
              });
              
              logger.info(`Saved result for message ${message.id} with ID ${saveResult.id}`);
              
              // Emit LLM call complete event
              sseManager.broadcastEvent(parseInt(evaluationId), {
                type: 'llm_call_complete',
                messageId: message.id,
                success: true
              });

              return { success: true, responseTime };

            } catch (error) {
              // Record the LLM error to trigger delay for future calls
              this.recordLLMError();
              
              lastError = error;
              attemptCount = attempt + 1;
              logger.warn(`Attempt ${attemptCount} failed for message ${message.id}:`, error.message);
              
              // Wait before retry (except on last attempt)
              if (attempt < retryAttempts - 1) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
              }
            }
          }

          // All retries failed
          logger.error(`All ${attemptCount} attempts failed for message ${message.id}:`, lastError?.message || lastError, lastError?.stack);
          
          // Save error result
          await this.saveEvaluationResult({
            evaluationId,
            datasetMessageId: message.id,
            llmLabel: null,
            llmFullResponse: null,
            responseTime: 0,
            errorMessage: lastError?.message || 'Unknown error',
            retryCount: attemptCount
          });

          // Emit LLM call complete event with failure
          sseManager.broadcastEvent(parseInt(evaluationId), {
            type: 'llm_call_complete',
            messageId: message.id,
            success: false,
            error: lastError?.message
          });

          return { success: false, responseTime: 0, error: lastError };
        };

        // Start processing the message
        const promise = processMessage().then(async (result) => {
          // Remove from active promises when done
          activePromises.delete(message.id);
          
          // Update counts and progress
          processedCount++;
          totalTime += result.responseTime;
          processedInBatch++;
          
          // Check for rate limit errors and apply exponential backoff
          if (!result.success && result.error) {
            const errorMessage = result.error.message?.toLowerCase() || '';
            if (errorMessage.includes('rate limit') || errorMessage.includes('throttl')) {
              // Exponential backoff for rate limiting
              rateLimitBackoffMs = Math.min(rateLimitBackoffMs === 0 ? 1000 : rateLimitBackoffMs * 2, 60000);
              logger.warn(`Rate limit detected, setting backoff to ${rateLimitBackoffMs}ms`);
            }
          }
          
          // Update progress periodically (every 10 messages or when queue is empty)
          if (processedInBatch >= 10 || (messageQueue.length === 0 && activePromises.size === 0)) {
            // Use setImmediate to defer database updates and avoid blocking
            setImmediate(async () => {
              try {
                await this.updateEvaluationProgress(evaluationId, processedCount, totalTime);
                await this.updateHeartbeat(evaluationId);
                logger.info(`Evaluation ${evaluationId}: Processed ${processedCount}/${messages.length} messages`);
              } catch (error) {
                logger.error(`Failed to update progress for evaluation ${evaluationId}:`, error);
              }
            });
            processedInBatch = 0;
          }
          
          return result;
        });
        
        // Track the active promise
        activePromises.set(message.id, promise);
      }
      
      // If we have active promises but no more messages to queue, wait for one to complete
      if (activePromises.size > 0 && (messageQueue.length === 0 || activePromises.size >= effectiveMaxConcurrent)) {
        await Promise.race(activePromises.values());
      }
      
      // Add a small delay to yield to other operations (allows frontend requests to process)
      await new Promise(resolve => setImmediate(resolve));
    }
    
    // Wait for any remaining active promises
    if (activePromises.size > 0) {
      await Promise.all(activePromises.values());
    }

    // Only mark as completed if not stopped (paused)
    if (!shouldStop) {
      // Calculate final accuracy statistics
      const finalStats = await this.calculateEvaluationStats(evaluationId);
      
      // Calculate incorrect predictions
      const incorrectPredictions = Math.max(0, processedCount - finalStats.correctPredictions - finalStats.errorCount);
      
      // Mark evaluation as completed with accuracy stats
      await this.updateEvaluationStatus(evaluationId, 'completed', {
        completed_at: new Date().toISOString(),
        accuracy: finalStats.accuracy,
        correct_predictions: finalStats.correctPredictions,
        incorrect_predictions: incorrectPredictions,
        error_count: finalStats.errorCount
      });

      logger.info(`Evaluation ${evaluationId} completed. Processed ${processedCount} messages in ${totalTime}ms. Accuracy: ${finalStats.accuracy}%`);
    } else {
      logger.info(`Evaluation ${evaluationId} was paused. Processed ${processedCount} messages before stopping.`);
    }
  }

  /**
   * Extract label from LLM response using the returnLabel pattern
   */
  extractLabel(responseText, openingTag, closingTag) {
    if (!responseText || !openingTag || !closingTag) {
      return null;
    }

    try {
      // Simple string search approach - much more reliable than regex
      const startIndex = responseText.indexOf(openingTag);
      if (startIndex === -1) {
        logger.debug(`Opening tag "${openingTag}" not found in response`);
        return null;
      }
      
      const contentStartIndex = startIndex + openingTag.length;
      const endIndex = responseText.indexOf(closingTag, contentStartIndex);
      if (endIndex === -1) {
        logger.debug(`Closing tag "${closingTag}" not found in response after opening tag`);
        return null;
      }
      
      // Extract the content between the tags
      const extractedValue = responseText.substring(contentStartIndex, endIndex);
      const trimmedValue = extractedValue.trim().toLowerCase();
      
      logger.debug(`Extracted value: "${extractedValue}" → "${trimmedValue}"`);
      
      // Convert to boolean
      if (trimmedValue === 'true') return true;
      if (trimmedValue === 'false') return false;
      
      // If not true/false, return null
      logger.warn(`Extracted value "${trimmedValue}" is not a valid boolean`);
      return null;
      
    } catch (error) {
      logger.error('Failed to extract label:', error);
      return null;
    }
  }

  /**
   * Get dataset messages for evaluation
   */
  async getDatasetMessages(datasetId) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM dataset_messages WHERE dataset_id = ? ORDER BY id',
        [datasetId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  /**
   * Get dataset message count
   */
  async getDatasetMessageCount(datasetId) {
    const db = getDatabase();
    
    const result = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM dataset_messages WHERE dataset_id = ?',
        [datasetId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    return result.count;
  }

  /**
   * Save evaluation result
   */
  async saveEvaluationResult(resultData) {
    const {
      evaluationId,
      datasetMessageId,
      llmLabel,
      llmFullResponse,
      responseTime,
      errorMessage,
      retryCount
    } = resultData;

    logger.info(`Attempting to save result for evaluation ${evaluationId}, message ${datasetMessageId}, label: ${llmLabel}`);

    // Use the database queue to prevent write contention
    const result = await dbQueue.executeWrite(
      `INSERT INTO evaluation_results (
        evaluation_id, dataset_message_id, llmLabel, llmFullResponse,
        response_time_ms, error_message, retry_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        evaluationId,
        datasetMessageId,
        llmLabel,
        llmFullResponse,
        responseTime,
        errorMessage,
        retryCount
      ],
      `Save result for evaluation ${evaluationId}, message ${datasetMessageId}`
    );
    
    logger.info(`Successfully saved evaluation result with ID ${result.lastID}`);
    return { id: result.lastID };
  }

  /**
   * Update evaluation progress
   */
  async updateEvaluationProgress(id, processedMessages, totalTime) {
    const db = getDatabase();
    
    const result = await new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        UPDATE evaluations 
        SET processed_messages = ?, total_time_ms = ?
        WHERE id = ?
      `);
      
      stmt.run(processedMessages, totalTime, id, function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
      
      stmt.finalize();
    });

    // Broadcast progress update to SSE connections
    try {
      const updatedEvaluation = await this.getEvaluationById(id);
      logger.info(`[SSE] About to broadcast progress update for evaluation ${id}`);
      sseManager.broadcastEvaluationUpdate(parseInt(id), updatedEvaluation);
    } catch (error) {
      logger.error(`Failed to broadcast progress update for evaluation ${id}:`, error);
    }

    return result;
  }

  /**
   * Update evaluation status
   */
  async updateEvaluationStatus(id, status, additionalFields = {}) {
    const db = getDatabase();
    
    const fields = Object.keys(additionalFields);
    const values = Object.values(additionalFields);
    
    let sql = 'UPDATE evaluations SET status = ?';
    const params = [status];
    
    fields.forEach(field => {
      sql += `, ${field} = ?`;
      params.push(values[fields.indexOf(field)]);
    });
    
    sql += ' WHERE id = ?';
    params.push(id);
    
    const result = await new Promise((resolve, reject) => {
      const stmt = db.prepare(sql);
      stmt.run(params, function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
      stmt.finalize();
    });

    // Broadcast status update to SSE connections
    try {
      const updatedEvaluation = await this.getEvaluationById(id);
      logger.info(`[SSE] About to broadcast status update for evaluation ${id}, status: ${status}`);
      
      if (status === 'completed' || status === 'failed') {
        // Broadcast completion and close connections
        sseManager.broadcastEvaluationComplete(parseInt(id), updatedEvaluation);
      } else {
        // Broadcast regular status update
        sseManager.broadcastEvaluationUpdate(parseInt(id), updatedEvaluation);
      }
    } catch (error) {
      logger.error(`Failed to broadcast status update for evaluation ${id}:`, error);
    }

    return result;
  }

  /**
   * Get evaluation results
   */
  async getEvaluationResults(evaluationId, page = 1, pageSize = 50) {
    const offset = (page - 1) * pageSize;
    const db = getDatabase();

    try {
      // Get total count
      const countResult = await new Promise((resolve, reject) => {
        db.get(
          'SELECT COUNT(*) as total FROM evaluation_results WHERE evaluation_id = ?',
          [evaluationId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      // Get results with message content
      const results = await new Promise((resolve, reject) => {
        db.all(`
          SELECT 
            er.*,
            dm.messageContent,
            dm.label as expected_label
          FROM evaluation_results er
          LEFT JOIN dataset_messages dm ON er.dataset_message_id = dm.id
          WHERE er.evaluation_id = ?
          ORDER BY er.id
          LIMIT ? OFFSET ?
        `, [evaluationId, pageSize, offset], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      const total = countResult.total;
      const totalPages = Math.ceil(total / pageSize);

      return {
        results,
        pagination: {
          page,
          pageSize,
          total,
          totalPages
        }
      };
    } catch (error) {
      logger.error('Failed to fetch evaluation results:', error);
      throw new AppError('Failed to fetch evaluation results', 500);
    }
  }

  /**
   * Delete an evaluation (hard delete)
   */
  async deleteEvaluation(id, userId) {
    const evaluation = await this.getEvaluationById(id);
    
    // Check permissions
    if (evaluation.created_by !== userId) {
      throw new AppError('Not authorized to delete this evaluation', 403);
    }

    // Don't allow deletion of running evaluations
    if (evaluation.status === 'running') {
      throw new AppError('Cannot delete a running evaluation', 400);
    }

    const db = getDatabase();

    try {
      await new Promise((resolve, reject) => {
        const stmt = db.prepare('DELETE FROM evaluation_results WHERE evaluation_id = ?');
        stmt.run(id, function(err) {
          if (err) {
            reject(err);
          } else {
            const deleteEvalStmt = db.prepare('DELETE FROM evaluations WHERE id = ?');
            deleteEvalStmt.run(id, function(err) {
              if (err) reject(err);
              else resolve({ changes: this.changes });
            });
            deleteEvalStmt.finalize();
          }
        });
        stmt.run(id, function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        });
        stmt.finalize();
      });

      logger.info(`Deleted evaluation with ID: ${id}`);
      return { message: 'Evaluation deleted successfully' };
    } catch (error) {
      logger.error('Failed to delete evaluation:', error);
      throw new AppError('Failed to delete evaluation', 500);
    }
  }

  /**
   * Calculate accuracy statistics for an evaluation
   */
  async calculateEvaluationStats(evaluationId) {
    const db = getDatabase();

    try {
      const results = await new Promise((resolve, reject) => {
        db.all(`
          SELECT 
            er.llmLabel,
            er.error_message,
            dm.label as expected_label
          FROM evaluation_results er
          LEFT JOIN dataset_messages dm ON er.dataset_message_id = dm.id
          WHERE er.evaluation_id = ?
        `, [evaluationId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      const totalResults = results.length;
      let correctPredictions = 0;
      let errorCount = 0;

      results.forEach(result => {
        if (result.error_message) {
          errorCount++;
        } else if (result.llmLabel !== null && result.expected_label !== null) {
          // Convert both to booleans for proper comparison (SQLite stores as 0/1)
          const llmPrediction = !!result.llmLabel;
          const expectedLabel = !!result.expected_label;
          if (llmPrediction === expectedLabel) {
            correctPredictions++;
          }
        }
      });

      const validResults = totalResults - errorCount;
      const accuracy = validResults > 0 ? (correctPredictions / validResults) * 100 : 0;

      return {
        totalResults,
        correctPredictions,
        errorCount,
        accuracy: Math.round(accuracy * 100) / 100 // Round to 2 decimal places
      };
    } catch (error) {
      logger.error(`Failed to calculate stats for evaluation ${evaluationId}:`, error);
      throw error;
    }
  }

  /**
   * Update evaluation name
   */
  async updateEvaluationName(id, name, userId) {
    const evaluation = await this.getEvaluationById(id);
    
    // Check if user owns the evaluation
    if (evaluation.created_by !== userId) {
      throw new AppError('You can only edit evaluations you created', 403);
    }
    
    const db = getDatabase();
    
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE evaluations SET name = ? WHERE id = ?',
        [name, id],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
    
    return this.getEvaluationById(id);
  }

  /**
   * Validate evaluation status - check if truly running or stuck
   */
  async validateEvaluationStatus(id, userId) {
    const evaluation = await this.getEvaluationById(id);
    
    // Check if user owns the evaluation
    if (evaluation.created_by !== userId) {
      throw new AppError('You can only check evaluations you created', 403);
    }

    const db = getDatabase();
    const now = new Date();
    const serverStartTime = new Date(process.env.SERVER_START_TIME || now);

    let actualStatus = evaluation.status;
    let isStuck = false;
    let canResume = false;
    let reason = '';

    if (evaluation.status === 'running') {
      // Check if started before current server instance
      const startedAt = new Date(evaluation.started_at);
      if (startedAt < serverStartTime) {
        actualStatus = 'stuck';
        isStuck = true;
        canResume = true;
        reason = 'Evaluation was running when server restarted';
      }
      // Check if no heartbeat for more than 5 minutes
      else if (evaluation.last_heartbeat) {
        const lastHeartbeat = new Date(evaluation.last_heartbeat);
        const minutesSinceHeartbeat = (now - lastHeartbeat) / (1000 * 60);
        if (minutesSinceHeartbeat > 5) {
          actualStatus = 'stuck';
          isStuck = true;
          canResume = true;
          reason = `No progress for ${Math.round(minutesSinceHeartbeat)} minutes`;
        }
      }
      // Check if timeout exceeded
      else if (evaluation.timeout_at) {
        const timeoutAt = new Date(evaluation.timeout_at);
        if (now > timeoutAt) {
          actualStatus = 'timeout';
          isStuck = true;
          canResume = true;
          reason = 'Evaluation exceeded timeout limit';
        }
      }
    }

    // Update database if status changed
    if (isStuck && evaluation.status === 'running') {
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE evaluations 
           SET can_resume = 1, failure_reason = ?, last_heartbeat = ? 
           WHERE id = ?`,
          [reason, now.toISOString(), id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    return {
      id: evaluation.id,
      displayStatus: evaluation.status,
      actualStatus,
      isStuck,
      canResume: canResume || evaluation.can_resume,
      reason: reason || evaluation.failure_reason,
      progress: {
        processed: evaluation.processed_messages || 0,
        total: evaluation.total_messages || 0,
        percentage: evaluation.total_messages ? 
          Math.round((evaluation.processed_messages || 0) / evaluation.total_messages * 100) : 0
      },
      timing: {
        started_at: evaluation.started_at,
        last_heartbeat: evaluation.last_heartbeat,
        timeout_at: evaluation.timeout_at,
        total_time_ms: evaluation.total_time_ms
      }
    };
  }

  /**
   * Stop a running evaluation
   */
  async stopEvaluation(id, userId) {
    const evaluation = await this.getEvaluationById(id);
    
    // Check if user owns the evaluation
    if (evaluation.created_by !== userId) {
      throw new AppError('You can only stop evaluations you created', 403);
    }

    if (evaluation.status !== 'running') {
      throw new AppError('Evaluation is not currently running', 400);
    }

    const db = getDatabase();
    const now = new Date().toISOString();

    // Mark as paused and enable resume
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE evaluations 
         SET status = 'paused', 
             can_resume = 1,
             failure_reason = 'Manually paused' 
         WHERE id = ?`,
        [id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    logger.info(`Evaluation ${id} manually paused by user ${userId}`);
    
    // Broadcast status update to connected clients
    try {
      const updatedEvaluation = await this.getEvaluationById(id);
      sseManager.broadcastEvaluationUpdate(parseInt(id), updatedEvaluation);
    } catch (error) {
      logger.error(`Failed to broadcast stop event for evaluation ${id}:`, error);
    }

    return { message: 'Evaluation stopped successfully' };
  }

  /**
   * Reset evaluation back to pending state
   */
  async resetEvaluation(id, userId) {
    const evaluation = await this.getEvaluationById(id);
    
    // Check if user owns the evaluation
    if (evaluation.created_by !== userId) {
      throw new AppError('You can only reset evaluations you created', 403);
    }

    if (!['failed', 'running'].includes(evaluation.status)) {
      throw new AppError('Can only reset failed or stuck evaluations', 400);
    }

    const db = getDatabase();

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE evaluations 
         SET status = 'pending',
             processed_messages = 0,
             correct_predictions = NULL,
             incorrect_predictions = 0,
             error_count = NULL,
             accuracy = NULL,
             total_time_ms = 0,
             started_at = NULL,
             completed_at = NULL,
             last_heartbeat = NULL,
             timeout_at = NULL,
             can_resume = 0,
             failure_reason = NULL
         WHERE id = ?`,
        [id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Clear evaluation results
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM evaluation_results WHERE evaluation_id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    logger.info(`Evaluation ${id} reset by user ${userId}`);

    return { message: 'Evaluation reset successfully' };
  }

  /**
   * Resume evaluation from where it left off
   */
  async resumeEvaluation(id, userId) {
    const evaluation = await this.getEvaluationById(id);
    
    // Check if user owns the evaluation
    if (evaluation.created_by !== userId) {
      throw new AppError('You can only resume evaluations you created', 403);
    }

    if (!evaluation.can_resume) {
      throw new AppError('This evaluation cannot be resumed', 400);
    }

    if (evaluation.status === 'running') {
      throw new AppError('Evaluation is already running', 400);
    }

    // Start the evaluation from current progress
    return this.startEvaluation(id, userId, true); // true = resume mode
  }

  async retryErrors(id, userId) {
    try {
      logger.info(`Starting retryErrors for evaluation ${id} by user ${userId}`);
      
      const evaluation = await this.getEvaluationById(id);
      
      // Check if user owns the evaluation
      if (evaluation.created_by !== userId) {
        throw new AppError('You can only retry errors for evaluations you created', 403);
      }

      if (evaluation.status !== 'completed' && evaluation.status !== 'failed') {
        throw new AppError('Can only retry errors for completed or failed evaluations', 400);
      }

    // Check if there are any errors to retry
    const db = getDatabase();
    const errorResults = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as errorCount FROM evaluation_results WHERE evaluation_id = ? AND error_message IS NOT NULL',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.errorCount);
        }
      );
    });

    if (errorResults === 0) {
      throw new AppError('No errors found to retry', 400);
    }

    logger.info(`Starting error retry for evaluation ${id} with ${errorResults} errors`);

    // Delete existing error results so they can be retried
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM evaluation_results WHERE evaluation_id = ? AND error_message IS NOT NULL',
        [id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Update evaluation status back to running and clear completion time
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE evaluations 
         SET status = 'running', 
             completed_at = NULL,
             can_resume = 1,
             processed_messages = processed_messages - ?,
             error_count = NULL,
             accuracy = NULL,
             correct_predictions = NULL,
             incorrect_predictions = 0
         WHERE id = ?`,
        [errorResults, id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Start processing the error messages
    this.processEvaluationMessages(id, true); // true = resume mode

    // Get updated evaluation
    const updatedEvaluation = await this.getEvaluationById(id);
    
    // Broadcast status update to connected clients
    try {
      sseManager.broadcastEvaluationUpdate(parseInt(id), updatedEvaluation);
    } catch (broadcastError) {
      logger.error('Failed to broadcast error retry update:', broadcastError);
    }

    return updatedEvaluation;
    } catch (error) {
      logger.error(`Failed to retry errors for evaluation ${id}:`, error.message, error.stack);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to retry errors', 500);
    }
  }

  /**
   * Rerun a completed evaluation by creating a new evaluation with the same configuration
   */
  async rerunEvaluation(id, userId) {
    try {
      logger.info(`Starting rerun for evaluation ${id} by user ${userId}`);
      
      const originalEvaluation = await this.getEvaluationById(id);
      
      // Check if user owns the evaluation
      if (originalEvaluation.created_by !== userId) {
        throw new AppError('You can only rerun evaluations you created', 403);
      }

      if (originalEvaluation.status !== 'completed') {
        throw new AppError('Can only rerun completed evaluations', 400);
      }

      // Create a new evaluation with the same configuration
      const newEvaluationData = {
        name: `${originalEvaluation.name} (Rerun)`,
        description: originalEvaluation.description,
        promptId: originalEvaluation.prompt_id,
        datasetId: originalEvaluation.dataset_id
      };

      logger.info(`Creating rerun evaluation with data:`, newEvaluationData);

      // Create the new evaluation
      const newEvaluation = await this.createEvaluation(newEvaluationData, userId);
      
      // Start the new evaluation immediately
      const startedEvaluation = await this.startEvaluation(newEvaluation.id, userId);

      logger.info(`Started rerun evaluation with ID: ${startedEvaluation.id}`);
      return startedEvaluation;

    } catch (error) {
      logger.error(`Failed to rerun evaluation ${id}:`, error.message, error.stack);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to rerun evaluation', 500);
    }
  }

  /**
   * Update evaluation heartbeat to show it's still alive
   */
  async updateHeartbeat(id) {
    const db = getDatabase();
    const now = new Date().toISOString();

    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE evaluations SET last_heartbeat = ? WHERE id = ?',
        [now, id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }
}

export default new EvaluationsService();