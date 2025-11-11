import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock dependencies before importing
vi.mock('../config/database.js', () => ({
  getDatabase: vi.fn(() => ({
    all: vi.fn(),
    run: vi.fn()
  }))
}))

vi.mock('./logger.js', () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn()
  }
}))

describe('DatabaseQueue', () => {
  let dbQueue
  let mockDb
  let logger
  let getDatabase
  
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    
    // Set up mocks
    mockDb = {
      all: vi.fn(),
      run: vi.fn()
    }
    
    getDatabase = (await import('../config/database.js')).getDatabase
    getDatabase.mockReturnValue(mockDb)
    
    logger = (await import('./logger.js')).default
    
    // Create fresh instance
    const DbQueueModule = await import('./dbQueue.js')
    dbQueue = DbQueueModule.default
    
    // Reset queue state
    dbQueue.writeQueue = []
    dbQueue.isProcessing = false
  })

  describe('constructor', () => {
    it('should initialize with empty queue and get database instance', () => {
      expect(dbQueue.writeQueue).toEqual([])
      expect(dbQueue.isProcessing).toBe(false)
      expect(getDatabase).toHaveBeenCalled()
      expect(dbQueue.db).toBe(mockDb)
    })
  })

  describe('queueWrite', () => {
    it('should add operation to queue and process immediately if not processing', async () => {
      const mockOperation = vi.fn().mockResolvedValue('result')
      
      const result = await dbQueue.queueWrite(mockOperation, 'test operation')
      
      expect(result).toBe('result')
      expect(mockOperation).toHaveBeenCalled()
      expect(logger.debug).toHaveBeenCalledWith('Processing queued operation: test operation')
    })

    it('should queue multiple operations and process sequentially', async () => {
      const results = []
      const operation1 = vi.fn(async () => {
        results.push('op1-start')
        await new Promise(resolve => setTimeout(resolve, 10))
        results.push('op1-end')
        return 'result1'
      })
      
      const operation2 = vi.fn(async () => {
        results.push('op2-start')
        await new Promise(resolve => setTimeout(resolve, 5))
        results.push('op2-end')
        return 'result2'
      })
      
      const promise1 = dbQueue.queueWrite(operation1, 'operation 1')
      const promise2 = dbQueue.queueWrite(operation2, 'operation 2')
      
      const [result1, result2] = await Promise.all([promise1, promise2])
      
      expect(result1).toBe('result1')
      expect(result2).toBe('result2')
      // Operations should run sequentially, not concurrently
      expect(results).toEqual(['op1-start', 'op1-end', 'op2-start', 'op2-end'])
    })

    it('should handle operation errors', async () => {
      const error = new Error('Operation failed')
      const failingOperation = vi.fn().mockRejectedValue(error)
      
      await expect(dbQueue.queueWrite(failingOperation, 'failing operation'))
        .rejects.toThrow('Operation failed')
      
      expect(logger.error).toHaveBeenCalledWith('Failed queued operation: failing operation', error)
    })

    it('should use default description when none provided', async () => {
      const mockOperation = vi.fn().mockResolvedValue('result')
      
      await dbQueue.queueWrite(mockOperation)
      
      expect(logger.debug).toHaveBeenCalledWith('Processing queued operation: Database write')
    })

    it('should continue processing queue after error', async () => {
      const failingOp = vi.fn().mockRejectedValue(new Error('Failed'))
      const successOp = vi.fn().mockResolvedValue('success')
      
      const promise1 = dbQueue.queueWrite(failingOp, 'failing')
      const promise2 = dbQueue.queueWrite(successOp, 'success')
      
      await expect(promise1).rejects.toThrow('Failed')
      await expect(promise2).resolves.toBe('success')
      
      expect(successOp).toHaveBeenCalled()
    })
  })

  describe('processQueue', () => {
    it('should not start processing if already processing', async () => {
      dbQueue.isProcessing = true
      const mockOperation = vi.fn()
      dbQueue.writeQueue.push({
        operation: mockOperation,
        resolve: vi.fn(),
        reject: vi.fn(),
        description: 'test'
      })
      
      await dbQueue.processQueue()
      
      expect(mockOperation).not.toHaveBeenCalled()
    })

    it('should not process if queue is empty', async () => {
      dbQueue.isProcessing = false
      dbQueue.writeQueue = []
      
      await dbQueue.processQueue()
      
      expect(logger.debug).not.toHaveBeenCalled()
    })

    it('should set isProcessing flag during execution', async () => {
      let processingState = []
      const mockOperation = vi.fn(async () => {
        processingState.push(dbQueue.isProcessing)
        return 'result'
      })
      
      const promise = dbQueue.queueWrite(mockOperation, 'test')
      processingState.push(dbQueue.isProcessing) // Should be true during processing
      
      await promise
      processingState.push(dbQueue.isProcessing) // Should be false after completion
      
      expect(processingState).toEqual([true, true, false])
    })

    it('should use setImmediate between operations', async () => {
      const setImmediateSpy = vi.spyOn(global, 'setImmediate').mockImplementation(callback => {
        setTimeout(callback, 0)
        return {}
      })
      
      const op1 = vi.fn().mockResolvedValue('result1')
      const op2 = vi.fn().mockResolvedValue('result2')
      
      await Promise.all([
        dbQueue.queueWrite(op1, 'op1'),
        dbQueue.queueWrite(op2, 'op2')
      ])
      
      expect(setImmediateSpy).toHaveBeenCalled()
      setImmediateSpy.mockRestore()
    })
  })

  describe('executeRead', () => {
    it('should execute read query with parameters', async () => {
      const mockRows = [{ id: 1, name: 'test' }]
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockRows)
      })
      
      const result = await dbQueue.executeRead('SELECT * FROM test WHERE id = ?', [1])
      
      expect(mockDb.all).toHaveBeenCalledWith('SELECT * FROM test WHERE id = ?', [1], expect.any(Function))
      expect(result).toEqual(mockRows)
    })

    it('should execute read query without parameters', async () => {
      const mockRows = [{ count: 5 }]
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockRows)
      })
      
      const result = await dbQueue.executeRead('SELECT COUNT(*) as count FROM test')
      
      expect(mockDb.all).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM test', [], expect.any(Function))
      expect(result).toEqual(mockRows)
    })

    it('should handle read errors', async () => {
      const dbError = new Error('Read failed')
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(dbError)
      })
      
      await expect(dbQueue.executeRead('INVALID SQL')).rejects.toThrow('Read failed')
    })

    it('should return empty array when no results', async () => {
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, [])
      })
      
      const result = await dbQueue.executeRead('SELECT * FROM empty_table')
      
      expect(result).toEqual([])
    })
  })

  describe('executeWrite', () => {
    it('should queue write operation with parameters', async () => {
      const mockResult = { lastID: 1, changes: 1 }
      mockDb.run.mockImplementation((sql, params, callback) => {
        callback.call(mockResult, null)
      })
      
      const result = await dbQueue.executeWrite('INSERT INTO test VALUES (?)', ['value'], 'insert test')
      
      expect(result).toEqual({ lastID: 1, changes: 1 })
      expect(logger.debug).toHaveBeenCalledWith('Processing queued operation: insert test')
    })

    it('should queue write operation without parameters', async () => {
      const mockResult = { lastID: 2, changes: 1 }
      mockDb.run.mockImplementation((sql, params, callback) => {
        callback.call(mockResult, null)
      })
      
      const result = await dbQueue.executeWrite('CREATE TABLE test (id INTEGER)')
      
      expect(result).toEqual({ lastID: 2, changes: 1 })
      expect(logger.debug).toHaveBeenCalledWith('Processing queued operation: Database write')
    })

    it('should handle write errors', async () => {
      const dbError = new Error('Write failed')
      mockDb.run.mockImplementation((sql, params, callback) => {
        callback(dbError)
      })
      
      await expect(dbQueue.executeWrite('INVALID SQL', [], 'invalid write'))
        .rejects.toThrow('Write failed')
      
      expect(logger.error).toHaveBeenCalledWith('Failed queued operation: invalid write', dbError)
    })

    it('should serialize write operations', async () => {
      const executionOrder = []
      
      const write1 = () => new Promise(resolve => {
        setTimeout(() => {
          executionOrder.push('write1')
          resolve({ lastID: 1, changes: 1 })
        }, 20)
      })
      
      const write2 = () => new Promise(resolve => {
        setTimeout(() => {
          executionOrder.push('write2')
          resolve({ lastID: 2, changes: 1 })
        }, 10)
      })
      
      // Mock run to call our custom operations
      let operationIndex = 0
      const operations = [write1, write2]
      mockDb.run.mockImplementation((sql, params, callback) => {
        operations[operationIndex++]().then(result => {
          callback.call(result, null)
        })
      })
      
      const promise1 = dbQueue.executeWrite('SQL1', [], 'write1')
      const promise2 = dbQueue.executeWrite('SQL2', [], 'write2')
      
      await Promise.all([promise1, promise2])
      
      // Even though write2 would complete first in isolation, 
      // the queue should ensure write1 completes before write2 starts
      expect(executionOrder).toEqual(['write1', 'write2'])
    })
  })

  describe('integration scenarios', () => {
    it('should handle mixed read and write operations', async () => {
      // Reads should execute immediately, writes should be queued
      const readRows = [{ id: 1 }]
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, readRows)
      })
      
      const writeResult = { lastID: 1, changes: 1 }
      mockDb.run.mockImplementation((sql, params, callback) => {
        callback.call(writeResult, null)
      })
      
      const readPromise = dbQueue.executeRead('SELECT * FROM test')
      const writePromise = dbQueue.executeWrite('INSERT INTO test VALUES (1)')
      
      const [readResult, writeResult2] = await Promise.all([readPromise, writePromise])
      
      expect(readResult).toEqual(readRows)
      expect(writeResult2).toEqual(writeResult)
    })

    it('should maintain queue state across multiple operations', async () => {
      const operations = []
      
      for (let i = 0; i < 5; i++) {
        operations.push(
          dbQueue.queueWrite(
            () => Promise.resolve(`result${i}`),
            `operation${i}`
          )
        )
      }
      
      const results = await Promise.all(operations)
      
      expect(results).toEqual(['result0', 'result1', 'result2', 'result3', 'result4'])
      expect(dbQueue.writeQueue).toHaveLength(0)
      expect(dbQueue.isProcessing).toBe(false)
    })

    it('should recover from errors and continue processing', async () => {
      const successOp = vi.fn().mockResolvedValue('success')
      const errorOp = vi.fn().mockRejectedValue(new Error('failed'))
      const finalOp = vi.fn().mockResolvedValue('final')
      
      const promises = [
        dbQueue.queueWrite(successOp, 'success'),
        dbQueue.queueWrite(errorOp, 'error').catch(e => e.message),
        dbQueue.queueWrite(finalOp, 'final')
      ]
      
      const results = await Promise.all(promises)
      
      expect(results).toEqual(['success', 'failed', 'final'])
      expect(successOp).toHaveBeenCalled()
      expect(errorOp).toHaveBeenCalled()
      expect(finalOp).toHaveBeenCalled()
    })
  })
})