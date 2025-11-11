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

describe('PromptsService', () => {
  let promptsService
  let mockDb
  let mockStatement
  
  // Import modules once at top level - optimization applied
  let getDatabase
  let AppError
  let logger

  // Initialize imports before all tests - optimization applied
  beforeAll(async () => {
    getDatabase = (await import('../../config/database.js')).getDatabase
    AppError = (await import('../../middleware/errorHandler.js')).AppError
    logger = (await import('../../utils/logger.js')).default
    promptsService = (await import('./prompts.service.js')).default
  })

  beforeEach(() => {
    vi.clearAllMocks()

    mockStatement = {
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(),
      finalize: vi.fn()
    }

    mockDb = {
      prepare: vi.fn(() => mockStatement),
      get: vi.fn(),
      all: vi.fn(),
      run: vi.fn()
    }

    getDatabase.mockReturnValue(mockDb)
  })

  describe('createPrompt', () => {
    const validPromptData = {
      name: 'Test Prompt',
      modelId: 'claude-3-sonnet',
      promptText: 'Test prompt with {{messageContent}}',
      maxTokens: 1000,
      temperature: 0.3,
      topP: 0.2,
      stopSequences: ['STOP'],
      openingTag: '<result>',
      closingTag: '</result>'
    }

    it('should create a new prompt successfully', async () => {
      const userId = 1
      const promptId = 123

      // Mock the statement.run callback to simulate successful insertion
      mockStatement.run.mockImplementation((...args) => {
        const callback = args[args.length - 1]
        if (typeof callback === 'function') {
          process.nextTick(() => callback.call({ lastID: promptId }, null))
        }
        return { lastInsertRowid: promptId }
      })

      // Mock getPromptById (called after creation)
      const expectedPrompt = {
        id: promptId,
        name: validPromptData.name,
        modelId: validPromptData.modelId,
        promptText: validPromptData.promptText,
        maxTokens: validPromptData.maxTokens,
        temperature: validPromptData.temperature,
        topP: validPromptData.topP,
        stopSequences: JSON.stringify(validPromptData.stopSequences),
        openingTag: validPromptData.openingTag,
        closingTag: validPromptData.closingTag,
        parentPromptId: null,
        createdBy: userId
      }

      mockDb.get.mockImplementation((sql, params, callback) => {
        if (typeof callback === 'function') {
          process.nextTick(() => callback(null, expectedPrompt))
        }
        return expectedPrompt
      })

      const result = await promptsService.createPrompt(validPromptData, userId)

      expect(result).toEqual({
        id: promptId,
        name: validPromptData.name,
        modelId: validPromptData.modelId,
        promptText: validPromptData.promptText,
        maxTokens: validPromptData.maxTokens,
        temperature: validPromptData.temperature,
        topP: validPromptData.topP,
        stopSequences: validPromptData.stopSequences,
        openingTag: validPromptData.openingTag,
        closingTag: validPromptData.closingTag,
        parentPromptId: null,
        createdBy: userId
      })
    })

    it('should validate required fields', async () => {
      const userId = 1
      const incompleteData = { name: 'Test' }

      await expect(promptsService.createPrompt(incompleteData, userId))
        .rejects.toThrow('name, modelId, promptText, openingTag, and closingTag are required')
    })

    it('should validate maxTokens range', async () => {
      const userId = 1
      await expect(promptsService.createPrompt({ ...validPromptData, maxTokens: 0 }, userId))
        .rejects.toThrow('maxTokens must be between 1 and 200000')
    })

    it('should validate temperature range', async () => {
      const userId = 1
      await expect(promptsService.createPrompt({ ...validPromptData, temperature: -0.1 }, userId))
        .rejects.toThrow('temperature must be between 0 and 2')
    })

    it('should validate topP range', async () => {
      const userId = 1
      await expect(promptsService.createPrompt({ ...validPromptData, topP: 1.1 }, userId))
        .rejects.toThrow('topP must be between 0 and 1')
    })
  })

  describe('getPrompts', () => {
    it('should get prompts with pagination', async () => {
      const mockPrompts = [
        { id: 1, name: 'Prompt 1', stopSequences: '["STOP"]' },
        { id: 2, name: 'Prompt 2', stopSequences: null }
      ]

      let callCount = 0
      mockDb.get.mockImplementation((sql, params, callback) => {
        callCount++
        if (typeof callback === 'function') {
          // First call is for total count
          process.nextTick(() => callback(null, { total: 2 }))
        }
      })

      mockDb.all.mockImplementation((sql, params, callback) => {
        if (typeof callback === 'function') {
          process.nextTick(() => callback(null, mockPrompts))
        }
      })

      const result = await promptsService.getPrompts()

      expect(result.prompts).toHaveLength(2)
      expect(result.prompts[0].stopSequences).toEqual(['STOP'])
      expect(result.prompts[1].stopSequences).toBeNull()
      expect(result.pagination.total).toBe(2)
    })
  })

  describe('getPromptById', () => {
    it('should get prompt by id', async () => {
      const mockPrompt = {
        id: 1,
        name: 'Test Prompt',
        stopSequences: '["STOP"]'
      }

      mockDb.get.mockImplementation((sql, params, callback) => {
        if (typeof callback === 'function') {
          process.nextTick(() => callback(null, mockPrompt))
        }
        return mockPrompt
      })

      const result = await promptsService.getPromptById(1)

      expect(result.stopSequences).toEqual(['STOP'])
    })

    it('should throw error for non-existent prompt', async () => {
      mockDb.get.mockImplementation((sql, params, callback) => {
        if (typeof callback === 'function') {
          process.nextTick(() => callback(null, null))
        }
        return null
      })

      await expect(promptsService.getPromptById(999))
        .rejects.toThrow('Prompt not found')
    })
  })

  describe('updatePrompt', () => {
    const validUpdateData = {
      name: 'Updated Prompt',
      modelId: 'claude-3-haiku',
      promptText: 'Updated prompt text',
      openingTag: '<output>',
      closingTag: '</output>'
    }

    it('should update prompt successfully', async () => {
      const promptId = 1
      const userId = 1

      // Mock initial prompt lookup for authorization
      const existingPrompt = { 
        id: promptId, 
        created_by: userId,
        stopSequences: null
      }

      // Mock isPromptReferencedInEvaluations check
      let callCount = 0
      mockDb.get.mockImplementation((sql, params, callback) => {
        callCount++
        if (typeof callback === 'function') {
          if (callCount === 1) {
            // First call - getPromptById for authorization
            process.nextTick(() => callback(null, existingPrompt))
          } else if (callCount === 2) {
            // Second call - isPromptReferencedInEvaluations
            process.nextTick(() => callback(null, { count: 0 }))
          } else {
            // Third call - getPromptById for return value
            process.nextTick(() => callback(null, { ...existingPrompt, ...validUpdateData }))
          }
        }
      })

      // Mock update statement
      mockStatement.run.mockImplementation((...args) => {
        const callback = args[args.length - 1]
        if (typeof callback === 'function') {
          process.nextTick(() => callback.call({ changes: 1 }, null))
        }
        return { changes: 1 }
      })

      const result = await promptsService.updatePrompt(promptId, validUpdateData, userId)
      expect(result).toMatchObject(validUpdateData)
    })

    it('should throw error if prompt not found', async () => {
      mockDb.get.mockImplementation((sql, params, callback) => {
        if (typeof callback === 'function') {
          process.nextTick(() => callback(null, null))
        }
        return null
      })

      await expect(promptsService.updatePrompt(999, validUpdateData))
        .rejects.toThrow('Prompt not found')
    })
  })

  describe('deletePrompt', () => {
    it('should delete prompt successfully', async () => {
      const promptId = 1
      const userId = 1

      // Mock prompt exists and authorization check
      const existingPrompt = { 
        id: promptId, 
        created_by: userId 
      }

      let callCount = 0
      mockDb.get.mockImplementation((sql, params, callback) => {
        callCount++
        if (typeof callback === 'function') {
          if (callCount === 1) {
            // First call - getPromptById for authorization
            process.nextTick(() => callback(null, existingPrompt))
          } else if (callCount === 2) {
            // Second call - isPromptReferencedInEvaluations
            process.nextTick(() => callback(null, { count: 0 }))
          } else {
            // Third call - check for child prompts
            process.nextTick(() => callback(null, { count: 0 }))
          }
        }
      })

      // Mock delete statement
      mockStatement.run.mockImplementation((...args) => {
        const callback = args[args.length - 1]
        if (typeof callback === 'function') {
          process.nextTick(() => callback.call({ changes: 1 }, null))
        }
        return { changes: 1 }
      })

      const result = await promptsService.deletePrompt(promptId, userId)
      expect(result).toEqual({ message: 'Prompt deleted successfully' })
    })
  })

  describe('getPromptStats', () => {
    it('should get prompt statistics', async () => {
      const mockStats = { 
        totalPrompts: 10, 
        totalCreators: 5, 
        totalVersions: 3 
      }

      mockDb.get.mockImplementation((sql, callback) => {
        if (typeof callback === 'function') {
          process.nextTick(() => callback(null, mockStats))
        }
      })

      const result = await promptsService.getPromptStats()
      expect(result).toEqual({
        totalPrompts: 10,
        totalCreators: 5,
        totalVersions: 3
      })
    })
  })

  describe('isPromptReferencedInEvaluations', () => {
    it('should return true for prompt with evaluations', async () => {
      mockDb.get.mockImplementation((sql, params, callback) => {
        if (typeof callback === 'function') {
          process.nextTick(() => callback(null, { count: 5 }))
        }
        return { count: 5 }
      })

      const result = await promptsService.isPromptReferencedInEvaluations(1)
      expect(result).toBe(true)
    })

    it('should return false for prompt with no evaluations', async () => {
      mockDb.get.mockImplementation((sql, params, callback) => {
        if (typeof callback === 'function') {
          process.nextTick(() => callback(null, { count: 0 }))
        }
        return { count: 0 }
      })

      const result = await promptsService.isPromptReferencedInEvaluations(1)
      expect(result).toBe(false)
    })
  })

  describe('updatePromptName', () => {
    it('should update prompt name successfully', async () => {
      const promptId = 1
      const newName = 'Updated Name'
      const userId = 1

      // Mock the prompt with proper ownership
      const existingPrompt = { 
        id: promptId, 
        created_by: userId,
        stopSequences: null 
      }

      let callCount = 0
      mockDb.get.mockImplementation((sql, params, callback) => {
        callCount++
        if (typeof callback === 'function') {
          if (callCount === 1) {
            // First call - getPromptById for authorization
            process.nextTick(() => callback(null, existingPrompt))
          } else {
            // Second call - getPromptById for return value
            process.nextTick(() => callback(null, { ...existingPrompt, name: newName }))
          }
        }
      })

      mockDb.run.mockImplementation((...args) => {
        const callback = args[args.length - 1]
        if (typeof callback === 'function') {
          process.nextTick(() => callback.call({ changes: 1 }, null))
        }
        return { changes: 1 }
      })

      const result = await promptsService.updatePromptName(promptId, newName, userId)
      expect(result.name).toBe(newName)
    })
  })

  describe('getPromptVersions', () => {
    it('should get prompt versions', async () => {
      const mockVersions = [
        { id: 1, name: 'Prompt v1', version: 1, stopSequences: null },
        { id: 2, name: 'Prompt v2', version: 2, stopSequences: null }
      ]

      mockDb.all.mockImplementation((sql, params, callback) => {
        if (typeof callback === 'function') {
          process.nextTick(() => callback(null, mockVersions))
        }
        return mockVersions
      })

      const result = await promptsService.getPromptVersions(1)
      expect(result).toEqual(mockVersions)
    })
  })
})