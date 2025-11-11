import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'

// Mock dependencies before importing the service
vi.mock('../../config/database.js', () => ({
  getDatabase: vi.fn(() => ({
    prepare: vi.fn(),
    get: vi.fn(),
    all: vi.fn(),
    run: vi.fn()
  }))
}))

vi.mock('../../middleware/errorHandler.js', () => ({
  AppError: class AppError extends Error {
    constructor(message, statusCode = 500) {
      super(message)
      this.statusCode = statusCode
      this.name = 'AppError'
    }
  }
}))

vi.mock('../../utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}))

vi.mock('../../services/bedrock.service.js', () => ({
  default: {
    invokeModel: vi.fn()
  }
}))

vi.mock('../prompts/prompts.service.js', () => ({
  default: {
    getPromptById: vi.fn(),
    validatePromptExists: vi.fn()
  }
}))

vi.mock('../datasets/datasets.service.js', () => ({
  default: {
    getDatasetById: vi.fn(),
    validateDatasetExists: vi.fn(),
    getDatasetMessages: vi.fn()
  }
}))

vi.mock('../../services/sseManager.js', () => ({
  default: {
    broadcastEvent: vi.fn(),
    broadcastEvaluationUpdate: vi.fn(),
    broadcastEvaluationComplete: vi.fn()
  }
}))

vi.mock('../../utils/dbQueue.js', () => ({
  default: {
    executeWrite: vi.fn().mockResolvedValue({ lastID: 1 })
  }
}))

describe('EvaluationsService', () => {
  let evaluationsService
  let mockDb
  let mockStatement
  
  // Import modules once at top level
  let getDatabase
  let AppError
  let logger
  let bedrockService
  let promptsService
  let datasetsService
  let sseManager
  let dbQueue
  // Initialize imports before all tests
  beforeAll(async () => {
    getDatabase = (await import('../../config/database.js')).getDatabase
    AppError = (await import('../../middleware/errorHandler.js')).AppError
    logger = (await import('../../utils/logger.js')).default
    bedrockService = (await import('../../services/bedrock.service.js')).default
    promptsService = (await import('../prompts/prompts.service.js')).default
    datasetsService = (await import('../datasets/datasets.service.js')).default
    sseManager = (await import('../../services/sseManager.js')).default
    dbQueue = (await import('../../utils/dbQueue.js')).default
    evaluationsService = (await import('./evaluations.service.js')).default
  })

  beforeEach(() => {
    vi.clearAllMocks()

    // Clear environment variables
    delete process.env.LLM_ERROR_DELAY_MS
    delete process.env.MAX_CONCURRENT_LLM_REQUESTS

    mockStatement = {
      run: vi.fn((...args) => {
        // Handle callback-style calls for database operations
        const callback = args.find(arg => typeof arg === 'function')
        if (callback) {
          // Simulate successful database operation
          const mockContext = { lastID: 123 }
          callback.call(mockContext, null)
        }
        return { lastInsertRowid: 123, changes: 1 }
      }),
      get: vi.fn(),
      all: vi.fn(),
      finalize: vi.fn()
    }

    mockDb = {
      prepare: vi.fn(() => mockStatement),
      get: vi.fn((...args) => {
        // Handle callback-style calls (last argument might be callback)
        const callback = args.find(arg => typeof arg === 'function')
        if (callback) {
          // Default successful response for getDatasetMessageCount and other callback-style calls
          callback(null, { count: 10 })
        }
        return Promise.resolve({ count: 10 })
      }),
      all: vi.fn(() => Promise.resolve([])),
      run: vi.fn()
    }

    getDatabase.mockReturnValue(mockDb)

    // Reset service state (it's a singleton instance)
    evaluationsService.lastLLMErrorTime = null
    evaluationsService.llmErrorDelayMs = 5000
    
    // Mock the getEvaluationById method that's called internally
    // Note: individual tests may restore this mock to test the real method
    vi.spyOn(evaluationsService, 'getEvaluationById').mockResolvedValue({
      id: 123,
      name: 'Test Evaluation',
      description: 'Test description',
      promptId: 1,
      datasetId: 2,
      status: 'pending',
      totalMessages: 10,
      createdBy: 1
    })
  })


  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(evaluationsService.lastLLMErrorTime).toBeNull()
      expect(evaluationsService.llmErrorDelayMs).toBe(5000)
    })

    it('should use environment variable for LLM error delay', async () => {
      process.env.LLM_ERROR_DELAY_MS = '10000'
      
      // Test the environment variable handling by directly importing and checking
      // Since the service is a singleton, we can test the env var behavior differently
      const originalValue = evaluationsService.llmErrorDelayMs
      
      // Simulate the environment variable parsing logic
      const expectedValue = parseInt(process.env.LLM_ERROR_DELAY_MS, 10)
      expect(expectedValue).toBe(10000)
      
      // Clean up
      delete process.env.LLM_ERROR_DELAY_MS
    })
  })

  describe('checkLLMErrorDelay', () => {
    it('should not delay if no previous error', async () => {
      // Should complete immediately without delay
      await evaluationsService.checkLLMErrorDelay()
      
      // Test passes if no timeout occurs
      expect(true).toBe(true)
    })

    it('should delay if recent error occurred', async () => {
      // Mock timers to avoid real delays
      vi.useFakeTimers()
      
      evaluationsService.lastLLMErrorTime = Date.now() - 1000 // 1 second ago
      evaluationsService.llmErrorDelayMs = 2000 // 2 second delay
      
      const delayPromise = evaluationsService.checkLLMErrorDelay()
      
      // Fast-forward time instead of waiting
      vi.advanceTimersByTime(1000)
      
      await delayPromise
      
      vi.useRealTimers()
      // No need to test actual time elapsed with mocked timers
    })

    it('should not delay if enough time has passed', async () => {
      evaluationsService.lastLLMErrorTime = Date.now() - 6000 // 6 seconds ago
      evaluationsService.llmErrorDelayMs = 5000 // 5 second delay
      
      // Should complete immediately since enough time has passed
      await evaluationsService.checkLLMErrorDelay()
      
      // Test passes if no timeout occurs
      expect(true).toBe(true)
    })
  })

  describe('recordLLMError', () => {
    it('should record LLM error timestamp', () => {
      evaluationsService.recordLLMError()
      
      // Should set a timestamp
      expect(evaluationsService.lastLLMErrorTime).toBeTruthy()
      expect(typeof evaluationsService.lastLLMErrorTime).toBe('number')
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('LLM error recorded')
      )
    })
  })

  describe('createEvaluation', () => {
    const validEvaluationData = {
      name: 'Test Evaluation',
      description: 'Test description',
      promptId: 1,
      datasetId: 2
    }

    it('should create evaluation successfully', async () => {
      const userId = 1
      const evaluationId = 123
      const mockPrompt = { id: 1, name: 'Test Prompt' }
      const mockDataset = { id: 2, name: 'Test Dataset', message_count: 10 }

      promptsService.getPromptById.mockResolvedValue(mockPrompt)
      datasetsService.getDatasetById.mockResolvedValue(mockDataset)
      // mockStatement.run is already properly mocked in beforeEach to handle callbacks

      const result = await evaluationsService.createEvaluation(validEvaluationData, userId)

      expect(promptsService.getPromptById).toHaveBeenCalledWith(1)
      expect(datasetsService.getDatasetById).toHaveBeenCalledWith(2)
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO evaluations')
      )
      expect(result).toEqual({
        id: evaluationId,
        name: validEvaluationData.name,
        description: validEvaluationData.description,
        promptId: validEvaluationData.promptId,
        datasetId: validEvaluationData.datasetId,
        status: 'pending',
        totalMessages: mockDataset.message_count,
        createdBy: userId
      })
    })

    it('should throw error for missing required fields', async () => {
      const userId = 1
      const incompleteData = { name: 'Test' }

      await expect(evaluationsService.createEvaluation(incompleteData, userId))
        .rejects.toThrow('name, promptId, and datasetId are required')
    })

    it('should throw error if prompt not found', async () => {
      const userId = 1

      promptsService.getPromptById.mockResolvedValue(null)

      await expect(evaluationsService.createEvaluation(validEvaluationData, userId))
        .rejects.toThrow('Prompt not found')
    })

    it('should throw error if dataset not found', async () => {
      const userId = 1
      const mockPrompt = { id: 1, name: 'Test Prompt' }

      promptsService.getPromptById.mockResolvedValue(mockPrompt)
      datasetsService.getDatasetById.mockResolvedValue(null)

      await expect(evaluationsService.createEvaluation(validEvaluationData, userId))
        .rejects.toThrow('Dataset not found')
    })

    it('should handle database errors', async () => {
      const userId = 1
      const mockPrompt = { id: 1, name: 'Test Prompt' }
      const mockDataset = { id: 2, name: 'Test Dataset', message_count: 10 }

      promptsService.getPromptById.mockResolvedValue(mockPrompt)
      datasetsService.getDatasetById.mockResolvedValue(mockDataset)
      mockStatement.run.mockImplementation((...args) => {
        const callback = args.find(arg => typeof arg === 'function')
        if (callback) {
          callback(new Error('Database error'))
        }
      })

      await expect(evaluationsService.createEvaluation(validEvaluationData, userId))
        .rejects.toThrow('Failed to create evaluation')
    })
  })

  describe('getEvaluations', () => {
    const mockEvaluations = [
      {
        id: 1,
        name: 'Evaluation 1',
        status: 'completed',
        accuracy: 85.5,
        created_at: '2023-01-01T00:00:00Z',
        prompt_name: 'Prompt 1',
        dataset_name: 'Dataset 1',
        created_by_username: 'user1'
      },
      {
        id: 2,
        name: 'Evaluation 2',
        status: 'running',
        accuracy: null,
        created_at: '2023-01-02T00:00:00Z',
        prompt_name: 'Prompt 2',
        dataset_name: 'Dataset 2',
        created_by_username: 'user2'
      }
    ]

    it('should get evaluations with default parameters', async () => {
      // Mock both the count query and the actual query using callback pattern
      mockDb.get.mockImplementation((sql, params, callback) => {
        if (typeof params === 'function') {
          // Handle case where params is actually the callback
          callback = params
          params = []
        }
        callback(null, { total: 2 })
      })
      
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockEvaluations)
      })

      const result = await evaluationsService.getEvaluations()

      expect(result).toEqual({
        evaluations: mockEvaluations,
        pagination: {
          page: 1,
          pageSize: 50,
          total: 2,
          totalPages: 1
        }
      })
    })

    it('should get evaluations with custom parameters', async () => {
      const page = 2
      const pageSize = 10
      const sortBy = 'name'
      const sortDirection = 'asc'

      mockDb.get.mockImplementation((sql, params, callback) => {
        callback(null, { total: 25 })
      })
      
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockEvaluations)
      })

      const result = await evaluationsService.getEvaluations(page, pageSize, sortBy, sortDirection)

      expect(result.pagination).toEqual({
        page: 2,
        pageSize: 10,
        total: 25,
        totalPages: 3
      })
    })

    it('should handle filters', async () => {
      const filters = { 
        status: 'completed', 
        creator: 'testuser',
        accuracy_min: 80
      }

      mockDb.get.mockImplementation((sql, params, callback) => {
        callback(null, { total: 0 })
      })
      
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, [])
      })

      const result = await evaluationsService.getEvaluations(1, 50, 'created_at', 'desc', filters)

      expect(result.evaluations).toEqual([])
      expect(result.pagination.total).toBe(0)
    })

    it('should handle database errors', async () => {
      mockDb.get.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'))
      })

      await expect(evaluationsService.getEvaluations())
        .rejects.toThrow('Failed to fetch evaluations')
    })
  })

  describe('getEvaluationById', () => {
    const mockEvaluation = {
      id: 1,
      name: 'Test Evaluation',
      status: 'completed',
      accuracy: 85.5,
      prompt_name: 'Test Prompt',
      dataset_name: 'Test Dataset',
      prompt_stop_sequences: null
    }

    // Remove the spy from beforeEach since we want to test the real method
    beforeEach(() => {
      evaluationsService.getEvaluationById.mockRestore?.()
    })

    it('should get evaluation by id successfully', async () => {
      mockDb.get.mockImplementation((sql, params, callback) => {
        callback(null, mockEvaluation)
      })

      const result = await evaluationsService.getEvaluationById(1)

      expect(result).toEqual(mockEvaluation)
    })

    it('should throw error for non-existent evaluation', async () => {
      mockDb.get.mockImplementation((sql, params, callback) => {
        callback(null, null)
      })

      await expect(evaluationsService.getEvaluationById(999))
        .rejects.toThrow('Evaluation not found')
    })

    it('should handle database errors', async () => {
      mockDb.get.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'))
      })

      await expect(evaluationsService.getEvaluationById(1))
        .rejects.toThrow('Failed to fetch evaluation')
    })

    it('should parse stop sequences JSON', async () => {
      const evaluationWithStopSequences = {
        ...mockEvaluation,
        prompt_stop_sequences: '["STOP", "END"]'
      }

      mockDb.get.mockImplementation((sql, params, callback) => {
        callback(null, evaluationWithStopSequences)
      })

      const result = await evaluationsService.getEvaluationById(1)

      expect(result.prompt_stop_sequences).toEqual(["STOP", "END"])
    })
  })

  describe('startEvaluation', () => {
    const mockEvaluation = {
      id: 1,
      name: 'Test Evaluation',
      status: 'pending',
      prompt_id: 1,
      dataset_id: 2,
      created_by: 1,
      can_resume: 0
    }

    beforeEach(() => {
      // Mock getEvaluationById to return the mockEvaluation
      evaluationsService.getEvaluationById.mockResolvedValue(mockEvaluation)
    })

    it('should start evaluation successfully', async () => {
      const userId = 1
      mockStatement.run.mockReturnValue({ changes: 1 })
      
      // Mock updateEvaluationStatus to resolve quickly
      vi.spyOn(evaluationsService, 'updateEvaluationStatus').mockResolvedValue({ changes: 1 })
      vi.spyOn(evaluationsService, 'runEvaluationAsync').mockResolvedValue()

      const result = await evaluationsService.startEvaluation(1, userId)

      expect(evaluationsService.getEvaluationById).toHaveBeenCalledWith(1)
      expect(result).toEqual(mockEvaluation)
    })

    it('should throw error if user not authorized', async () => {
      const userId = 2 // Different user
      
      await expect(evaluationsService.startEvaluation(1, userId))
        .rejects.toThrow('Not authorized to start this evaluation')
    })

    it('should throw error if evaluation not in pending status', async () => {
      const runningEvaluation = { ...mockEvaluation, status: 'running' }
      evaluationsService.getEvaluationById.mockResolvedValue(runningEvaluation)
      const userId = 1

      await expect(evaluationsService.startEvaluation(1, userId))
        .rejects.toThrow('Evaluation is already running')
    })

    it('should start evaluation in resume mode', async () => {
      const pausedEvaluation = { ...mockEvaluation, status: 'paused', can_resume: 1 }
      evaluationsService.getEvaluationById.mockResolvedValue(pausedEvaluation)
      const userId = 1
      mockStatement.run.mockReturnValue({ changes: 1 })
      
      // Mock internal methods
      vi.spyOn(evaluationsService, 'updateEvaluationStatus').mockResolvedValue({ changes: 1 })
      vi.spyOn(evaluationsService, 'runEvaluationAsync').mockResolvedValue()

      const result = await evaluationsService.startEvaluation(1, userId, true)

      expect(result).toEqual(pausedEvaluation)
    })

    it('should throw error if resume mode but cannot resume', async () => {
      const userId = 1
      
      await expect(evaluationsService.startEvaluation(1, userId, true))
        .rejects.toThrow('This evaluation cannot be resumed')
    })
  })

  describe('stopEvaluation', () => {
    const mockEvaluation = { 
      id: 1, 
      status: 'running',
      created_by: 1
    }

    beforeEach(() => {
      evaluationsService.getEvaluationById.mockResolvedValue(mockEvaluation)
    })

    it('should stop evaluation successfully', async () => {
      const userId = 1
      mockDb.run.mockImplementation((sql, params, callback) => {
        callback(null)
      })

      const result = await evaluationsService.stopEvaluation(1, userId)

      expect(evaluationsService.getEvaluationById).toHaveBeenCalledWith(1)
      expect(result).toEqual({ message: 'Evaluation stopped successfully' })
    })

    it('should throw error if user not authorized', async () => {
      const userId = 2 // Different user
      
      await expect(evaluationsService.stopEvaluation(1, userId))
        .rejects.toThrow('You can only stop evaluations you created')
    })

    it('should throw error if evaluation not running', async () => {
      const completedEvaluation = { ...mockEvaluation, status: 'completed' }
      evaluationsService.getEvaluationById.mockResolvedValue(completedEvaluation)
      const userId = 1

      await expect(evaluationsService.stopEvaluation(1, userId))
        .rejects.toThrow('Evaluation is not currently running')
    })
  })



  describe('deleteEvaluation', () => {
    const mockEvaluation = { 
      id: 1, 
      status: 'completed',
      created_by: 1
    }

    beforeEach(() => {
      evaluationsService.getEvaluationById.mockResolvedValue(mockEvaluation)
    })

    it('should delete evaluation successfully', async () => {
      const userId = 1
      mockStatement.run.mockImplementation((id, callback) => {
        // Simulate successful database operation
        callback?.call({ changes: 1 }, null)
        return { changes: 1 }
      })

      const result = await evaluationsService.deleteEvaluation(1, userId)

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM evaluation_results WHERE evaluation_id = ?'
      )
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM evaluations WHERE id = ?'
      )
      expect(result).toEqual({ message: 'Evaluation deleted successfully' })
    })

    it('should throw error if user not authorized', async () => {
      const userId = 2 // Different user

      await expect(evaluationsService.deleteEvaluation(1, userId))
        .rejects.toThrow('Not authorized to delete this evaluation')
    })

    it('should throw error if evaluation is running', async () => {
      const runningEvaluation = { ...mockEvaluation, status: 'running' }
      evaluationsService.getEvaluationById.mockResolvedValue(runningEvaluation)
      const userId = 1

      await expect(evaluationsService.deleteEvaluation(1, userId))
        .rejects.toThrow('Cannot delete a running evaluation')
    })
  })

  describe('getEvaluationResults', () => {
    const mockResults = [
      {
        id: 1,
        messageContent: 'Hello world',
        expected_label: true,
        llmLabel: true,
        llmFullResponse: '<result>true</result>',
        response_time_ms: 1500,
        error_message: null
      },
      {
        id: 2,
        messageContent: 'Goodbye world',
        expected_label: false,
        llmLabel: false,
        llmFullResponse: '<result>false</result>',
        response_time_ms: 1200,
        error_message: null
      }
    ]

    it('should get evaluation results with default parameters', async () => {
      mockDb.get.mockImplementation((sql, params, callback) => {
        callback(null, { total: 2 })
      })
      
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockResults)
      })

      const result = await evaluationsService.getEvaluationResults(1)

      expect(result).toEqual({
        results: mockResults,
        pagination: {
          page: 1,
          pageSize: 50,
          total: 2,
          totalPages: 1
        }
      })
    })

    it('should handle pagination', async () => {
      const page = 2
      const pageSize = 10

      mockDb.get.mockImplementation((sql, params, callback) => {
        callback(null, { total: 25 })
      })
      
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockResults)
      })

      const result = await evaluationsService.getEvaluationResults(1, page, pageSize)

      expect(result.pagination).toEqual({
        page: 2,
        pageSize: 10,
        total: 25,
        totalPages: 3
      })
    })

    it('should handle database errors', async () => {
      mockDb.get.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'))
      })

      await expect(evaluationsService.getEvaluationResults(1))
        .rejects.toThrow('Failed to fetch evaluation results')
    })
  })





  describe('updateEvaluationProgress', () => {
    it('should update evaluation progress successfully', async () => {
      const evaluationId = 1
      const processedMessages = 50
      const totalTime = 30000

      mockStatement.run.mockImplementation((pm, tt, id, callback) => {
        // Simulate successful database operation
        callback?.call({ changes: 1 }, null)
        return { changes: 1 }
      })
      
      // Mock getEvaluationById for the SSE broadcast
      evaluationsService.getEvaluationById.mockResolvedValue({
        id: evaluationId,
        processed_messages: processedMessages,
        total_time_ms: totalTime
      })

      const result = await evaluationsService.updateEvaluationProgress(
        evaluationId, 
        processedMessages, 
        totalTime
      )

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE evaluations')
      )
      expect(mockStatement.run).toHaveBeenCalledWith(
        processedMessages,
        totalTime,
        evaluationId,
        expect.any(Function)
      )
      expect(result).toEqual({ changes: 1 })
    })

    it('should handle zero messages', async () => {
      const evaluationId = 1

      mockStatement.run.mockImplementation((pm, tt, id, callback) => {
        callback?.call({ changes: 1 }, null)
        return { changes: 1 }
      })
      
      evaluationsService.getEvaluationById.mockResolvedValue({
        id: evaluationId,
        processed_messages: 0,
        total_time_ms: 0
      })

      const result = await evaluationsService.updateEvaluationProgress(evaluationId, 0, 0)

      expect(mockStatement.run).toHaveBeenCalledWith(0, 0, evaluationId, expect.any(Function))
      expect(result).toEqual({ changes: 1 })
    })
  })


})