import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock dependencies before importing the service
vi.mock('../../config/database.js', () => ({
  run: vi.fn(),
  get: vi.fn(),
  all: vi.fn()
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

vi.mock('../../services/jsonl.js', () => ({
  default: {
    parseJSONL: vi.fn()
  }
}))

describe('DatasetsService', () => {
  let datasetsService
  let database
  let JSONLParser
  let AppError

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()

    database = await import('../../config/database.js')
    JSONLParser = (await import('../../services/jsonl.js')).default
    AppError = (await import('../../middleware/errorHandler.js')).AppError
    datasetsService = (await import('./datasets.service.js')).default
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createDataset', () => {
    const mockMessages = [
      { messageContent: 'Hello world', label: true },
      { messageContent: 'Goodbye world', label: false }
    ]

    it('should create a new dataset successfully', async () => {
      const name = 'Test Dataset'
      const jsonlContent = '{"messageContent": "Hello", "label": true}'
      const createdBy = 1
      const datasetId = 123

      database.get.mockResolvedValue(null) // No existing dataset
      JSONLParser.parseJSONL.mockReturnValue(mockMessages)
      database.run.mockResolvedValueOnce({ id: datasetId }) // Dataset creation
      database.run.mockResolvedValue({ changes: 1 }) // Message insertions

      const result = await datasetsService.createDataset(name, jsonlContent, createdBy)

      expect(database.get).toHaveBeenCalledWith(
        'SELECT id FROM datasets WHERE name = ?',
        [name]
      )
      expect(JSONLParser.parseJSONL).toHaveBeenCalledWith(jsonlContent)
      expect(database.run).toHaveBeenCalledWith(
        'INSERT INTO datasets (name, created_by) VALUES (?, ?)',
        [name, createdBy]
      )
      expect(database.run).toHaveBeenCalledWith(
        'INSERT INTO dataset_messages (dataset_id, messageContent, label) VALUES (?, ?, ?)',
        [datasetId, mockMessages[0].messageContent, mockMessages[0].label]
      )
      expect(database.run).toHaveBeenCalledWith(
        'INSERT INTO dataset_messages (dataset_id, messageContent, label) VALUES (?, ?, ?)',
        [datasetId, mockMessages[1].messageContent, mockMessages[1].label]
      )

      expect(result).toEqual({
        id: datasetId,
        name,
        messageCount: 2,
        createdBy
      })
    })

    it('should throw error if dataset name already exists', async () => {
      const name = 'Existing Dataset'
      const jsonlContent = '{"messageContent": "Hello", "label": true}'
      const createdBy = 1

      database.get.mockResolvedValue({ id: 456 }) // Dataset exists

      await expect(datasetsService.createDataset(name, jsonlContent, createdBy))
        .rejects.toThrow('Dataset name already exists')
    })

    it('should handle JSONL parsing errors', async () => {
      const name = 'Test Dataset'
      const jsonlContent = 'invalid json'
      const createdBy = 1

      database.get.mockResolvedValue(null)
      JSONLParser.parseJSONL.mockImplementation(() => {
        throw new Error('Invalid JSON format')
      })

      await expect(datasetsService.createDataset(name, jsonlContent, createdBy))
        .rejects.toThrow('Invalid JSON format')
    })

    it('should handle database errors during dataset creation', async () => {
      const name = 'Test Dataset'
      const jsonlContent = '{"messageContent": "Hello", "label": true}'
      const createdBy = 1

      database.get.mockResolvedValue(null)
      JSONLParser.parseJSONL.mockReturnValue(mockMessages)
      database.run.mockRejectedValue(new Error('Database connection failed'))

      await expect(datasetsService.createDataset(name, jsonlContent, createdBy))
        .rejects.toThrow('Database connection failed')
    })

    it('should handle database errors during message insertion', async () => {
      const name = 'Test Dataset'
      const jsonlContent = '{"messageContent": "Hello", "label": true}'
      const createdBy = 1
      const datasetId = 123

      database.get.mockResolvedValue(null)
      JSONLParser.parseJSONL.mockReturnValue(mockMessages)
      database.run.mockResolvedValueOnce({ id: datasetId }) // Dataset creation succeeds
      database.run.mockRejectedValue(new Error('Message insertion failed')) // Message insertion fails

      await expect(datasetsService.createDataset(name, jsonlContent, createdBy))
        .rejects.toThrow('Message insertion failed')
    })

    it('should create dataset with empty messages array', async () => {
      const name = 'Empty Dataset'
      const jsonlContent = ''
      const createdBy = 1
      const datasetId = 123

      database.get.mockResolvedValue(null)
      JSONLParser.parseJSONL.mockReturnValue([])
      database.run.mockResolvedValue({ id: datasetId })

      const result = await datasetsService.createDataset(name, jsonlContent, createdBy)

      expect(result).toEqual({
        id: datasetId,
        name,
        messageCount: 0,
        createdBy
      })
    })
  })

  describe('getDatasets', () => {
    const mockDatasets = [
      {
        id: 1,
        name: 'Dataset 1',
        message_count: 10,
        created_at: '2023-01-01T00:00:00Z',
        created_by_username: 'user1'
      },
      {
        id: 2,
        name: 'Dataset 2',
        message_count: 20,
        created_at: '2023-01-02T00:00:00Z',
        created_by_username: 'user2'
      }
    ]

    it('should get datasets with default parameters', async () => {
      database.all.mockResolvedValueOnce(mockDatasets) // Datasets query
      database.get.mockResolvedValue({ total: 2 }) // Count query

      const result = await datasetsService.getDatasets()

      expect(database.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT \n        d.id,\n        d.name'),
        [50, 0]
      )
      expect(database.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as total'),
        []
      )

      expect(result).toEqual({
        datasets: mockDatasets,
        pagination: {
          page: 1,
          pageSize: 50,
          total: 2,
          totalPages: 1
        }
      })
    })

    it('should get datasets with custom parameters', async () => {
      const page = 2
      const pageSize = 10
      const sortBy = 'name'
      const sortDirection = 'asc'

      database.all.mockResolvedValue(mockDatasets)
      database.get.mockResolvedValue({ total: 25 })

      const result = await datasetsService.getDatasets(page, pageSize, sortBy, sortDirection)

      expect(database.all).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY d.name ASC'),
        [10, 10] // limit, offset
      )

      expect(result.pagination).toEqual({
        page: 2,
        pageSize: 10,
        total: 25,
        totalPages: 3
      })
    })

    it('should respect MAX_PAGE_SIZE environment variable', async () => {
      process.env.MAX_PAGE_SIZE = '25'
      
      database.all.mockResolvedValue([])
      database.get.mockResolvedValue({ total: 0 })

      await datasetsService.getDatasets(1, 100) // Request 100, should be limited to 25

      expect(database.all).toHaveBeenCalledWith(
        expect.any(String),
        [25, 0] // Should be limited to 25
      )

      delete process.env.MAX_PAGE_SIZE
    })

    it('should handle name filter', async () => {
      const filters = { name: 'test' }

      database.all.mockResolvedValue([])
      database.get.mockResolvedValue({ total: 0 })

      await datasetsService.getDatasets(1, 50, 'created_at', 'desc', filters)

      expect(database.all).toHaveBeenCalledWith(
        expect.stringContaining('1=1'),
        [50, 0]
      )
    })

    it('should handle createdBy filter', async () => {
      const filters = { creator: 'testuser' }

      database.all.mockResolvedValue([])
      database.get.mockResolvedValue({ total: 0 })

      await datasetsService.getDatasets(1, 50, 'created_at', 'desc', filters)

      expect(database.all).toHaveBeenCalledWith(
        expect.stringContaining('u.username = ?'),
        ['testuser', 50, 0]
      )
    })

    it('should handle multiple filters', async () => {
      const filters = { creator: 'testuser', created_at_from: '2023-01-01' }

      database.all.mockResolvedValue([])
      database.get.mockResolvedValue({ total: 0 })

      await datasetsService.getDatasets(1, 50, 'created_at', 'desc', filters)

      expect(database.all).toHaveBeenCalledWith(
        expect.stringContaining('u.username = ?'),
        ['testuser', '2023-01-01', 50, 0]
      )
    })

    it('should handle database errors', async () => {
      database.all.mockRejectedValue(new Error('Database error'))

      await expect(datasetsService.getDatasets())
        .rejects.toThrow('Database error')
    })

    it('should calculate pagination correctly for edge cases', async () => {
      database.all.mockResolvedValue([])
      database.get.mockResolvedValue({ total: 0 })

      const result = await datasetsService.getDatasets(1, 10)

      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0
      })
    })
  })

  describe('getDatasetById', () => {
    const mockDataset = {
      id: 1,
      name: 'Test Dataset',
      message_count: 5,
      created_at: '2023-01-01T00:00:00Z',
      created_by_username: 'testuser'
    }

    it('should get dataset by id successfully', async () => {
      database.get.mockResolvedValue(mockDataset)

      const result = await datasetsService.getDatasetById(1)

      expect(database.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT \n        d.id,\n        d.name'),
        [1]
      )
      expect(result).toEqual(mockDataset)
    })

    it('should throw error for non-existent dataset', async () => {
      database.get.mockResolvedValue(null)

      await expect(datasetsService.getDatasetById(999))
        .rejects.toThrow('Dataset not found')
    })

    it('should handle database errors', async () => {
      database.get.mockRejectedValue(new Error('Database error'))

      await expect(datasetsService.getDatasetById(1))
        .rejects.toThrow('Database error')
    })
  })

  describe('getDatasetMessages', () => {
    const mockMessages = [
      {
        id: 1,
        messageContent: 'Hello world',
        label: true,
        created_at: '2023-01-01T00:00:00Z'
      },
      {
        id: 2,
        messageContent: 'Goodbye world',
        label: false,
        created_at: '2023-01-01T00:01:00Z'
      }
    ]

    it('should get dataset messages with default parameters', async () => {
      database.get.mockResolvedValueOnce({ id: 1, name: 'Test Dataset' }) // getDatasetById call
      database.all.mockResolvedValueOnce(mockMessages)
      database.get.mockResolvedValue({ total: 2 })

      const result = await datasetsService.getDatasetMessages(1)

      expect(database.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, messageContent, label, created_at'),
        [1, 50, 0]
      )
      expect(result).toEqual({
        messages: mockMessages,
        pagination: {
          page: 1,
          pageSize: 50,
          total: 2,
          totalPages: 1
        }
      })
    })

    it('should get dataset messages with custom parameters', async () => {
      const page = 2
      const pageSize = 10

      database.get.mockResolvedValueOnce({ id: 1, name: 'Test Dataset' }) // getDatasetById call
      database.all.mockResolvedValue(mockMessages)
      database.get.mockResolvedValue({ total: 25 })

      const result = await datasetsService.getDatasetMessages(1, page, pageSize)

      expect(database.all).toHaveBeenCalledWith(
        expect.any(String),
        [1, 10, 10] // datasetId, limit, offset
      )

      expect(result.pagination).toEqual({
        page: 2,
        pageSize: 10,
        total: 25,
        totalPages: 3
      })
    })

    it('should handle database errors', async () => {
      database.all.mockRejectedValue(new Error('Database error'))

      await expect(datasetsService.getDatasetMessages(1))
        .rejects.toThrow('Database error')
    })
  })

  describe('updateDatasetName', () => {
    it('should update dataset name successfully', async () => {
      const datasetId = 1
      const newName = 'Updated Dataset Name'
      const userId = 1
      const mockDataset = { id: datasetId, name: 'Old Name', created_by: userId }

      database.get.mockResolvedValueOnce(mockDataset) // getDatasetById call
      database.get.mockResolvedValueOnce(null) // No existing dataset with same name
      database.run.mockResolvedValue({ changes: 1 })
      database.get.mockResolvedValueOnce({ id: datasetId, name: newName }) // Return updated dataset

      const result = await datasetsService.updateDatasetName(datasetId, newName, userId)

      expect(database.get).toHaveBeenCalledWith(
        'SELECT id FROM datasets WHERE name = ? AND id != ?',
        [newName, datasetId]
      )
      expect(database.run).toHaveBeenCalledWith(
        'UPDATE datasets SET name = ? WHERE id = ?',
        [newName, datasetId]
      )
      expect(result).toEqual({ id: datasetId, name: newName })
    })

    it('should throw error if dataset name already exists', async () => {
      const datasetId = 1
      const newName = 'Existing Name'
      const userId = 1
      const mockDataset = { id: datasetId, name: 'Old Name', created_by: userId }

      database.get.mockResolvedValueOnce(mockDataset) // getDatasetById call
      database.get.mockResolvedValue({ id: 2 }) // Another dataset has this name

      await expect(datasetsService.updateDatasetName(datasetId, newName, userId))
        .rejects.toThrow('A dataset with this name already exists')
    })

    it('should throw error if dataset not found', async () => {
      const datasetId = 999
      const newName = 'New Name'
      const userId = 1

      database.get.mockResolvedValue(null) // getDatasetById returns null

      await expect(datasetsService.updateDatasetName(datasetId, newName, userId))
        .rejects.toThrow('Dataset not found')
    })

    it('should throw error if user not authorized', async () => {
      const datasetId = 1
      const newName = 'New Name'
      const userId = 2 // Different user
      const mockDataset = { id: datasetId, name: 'Old Name', created_by: 1 } // Created by user 1

      database.get.mockResolvedValue(mockDataset) // getDatasetById call

      await expect(datasetsService.updateDatasetName(datasetId, newName, userId))
        .rejects.toThrow('You can only edit datasets you created')
    })
  })

  describe('deleteDataset', () => {
    it('should delete dataset successfully', async () => {
      const datasetId = 1
      const userId = 1
      const mockDataset = { id: datasetId, name: 'Test Dataset', created_by: userId }

      database.get.mockResolvedValueOnce(mockDataset) // getDatasetById call
      database.get.mockResolvedValue({ count: 0 }) // No evaluations using this dataset
      database.run.mockResolvedValue({ changes: 1 })

      const result = await datasetsService.deleteDataset(datasetId, userId)

      expect(database.get).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM evaluations WHERE dataset_id = ?',
        [datasetId]
      )
      expect(database.run).toHaveBeenCalledWith(
        'DELETE FROM dataset_messages WHERE dataset_id = ?',
        [datasetId]
      )
      expect(database.run).toHaveBeenCalledWith(
        'DELETE FROM datasets WHERE id = ?',
        [datasetId]
      )
      expect(result).toEqual({ message: 'Dataset deleted successfully' })
    })

    it('should throw error if dataset not found', async () => {
      const datasetId = 999
      const userId = 1

      database.get.mockResolvedValue(null) // getDatasetById returns null

      await expect(datasetsService.deleteDataset(datasetId, userId))
        .rejects.toThrow('Dataset not found')
    })

    it('should throw error if user not authorized', async () => {
      const datasetId = 1
      const userId = 2 // Different user
      const mockDataset = { id: datasetId, name: 'Test Dataset', created_by: 1 } // Created by user 1

      database.get.mockResolvedValue(mockDataset) // getDatasetById call

      await expect(datasetsService.deleteDataset(datasetId, userId))
        .rejects.toThrow('Not authorized to delete this dataset')
    })
  })

  describe('getDatasetStats', () => {
    const mockStats = {
      total_datasets: 5,
      total_messages: 100
    }

    it('should get dataset stats successfully', async () => {
      database.get.mockResolvedValue(mockStats)

      const result = await datasetsService.getDatasetStats()

      expect(result).toEqual({
        totalDatasets: 5,
        totalMessages: 100
      })
    })

    it('should handle dataset with no messages', async () => {
      const emptyStats = {
        total_datasets: 0,
        total_messages: 0
      }

      database.get.mockResolvedValue(emptyStats)

      const result = await datasetsService.getDatasetStats()

      expect(result).toEqual({
        totalDatasets: 0,
        totalMessages: 0
      })
    })

    it('should handle database errors', async () => {
      database.get.mockRejectedValue(new Error('Database error'))

      await expect(datasetsService.getDatasetStats())
        .rejects.toThrow('Database error')
    })
  })

  describe('createDatasetMessage', () => {
    it('should create dataset message successfully', async () => {
      const datasetId = 1
      const label = true
      const messageContent = 'New message'
      const messageId = 123
      const mockDataset = { id: datasetId, name: 'Test Dataset' }

      database.get.mockResolvedValueOnce(mockDataset) // getDatasetById call
      database.get.mockResolvedValueOnce({ count: 0 }) // No evaluations using this dataset
      database.run.mockResolvedValue({ id: messageId })

      const result = await datasetsService.createDatasetMessage(datasetId, label, messageContent)

      expect(database.run).toHaveBeenCalledWith(
        'INSERT INTO dataset_messages (dataset_id, messageContent, label) VALUES (?, ?, ?)',
        [datasetId, messageContent, label]
      )
      expect(result).toEqual({
        id: messageId,
        dataset_id: datasetId,
        label,
        messageContent
      })
    })

    it('should handle database errors', async () => {
      const datasetId = 1

      database.run.mockRejectedValue(new Error('Database error'))

      await expect(datasetsService.createDatasetMessage(datasetId, true, 'message'))
        .rejects.toThrow('Database error')
    })
  })
})