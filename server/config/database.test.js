import { describe, it, expect, beforeEach, vi } from 'vitest'

// Create mock functions that we can easily control
const mockRun = vi.fn()
const mockGet = vi.fn()
const mockAll = vi.fn()

const mockDb = {
  run: mockRun,
  get: mockGet,
  all: mockAll
}

// Mock Database constructor that accepts callback
const mockDatabase = vi.fn((path, callback) => {
  // Call the callback to simulate successful connection
  if (typeof callback === 'function') {
    callback(null)
  }
  return mockDb
})

vi.mock('sqlite3', () => ({
  default: {
    verbose: vi.fn(() => ({
      Database: mockDatabase
    }))
  }
}))

vi.mock('../utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('../scripts/setup-database.js', () => ({
  setupDatabase: vi.fn()
}))

describe('Database Configuration', () => {
  let database
  let logger
  let setupDatabase
  
  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Reset all mock functions
    mockRun.mockReset()
    mockGet.mockReset()
    mockAll.mockReset()
    mockDatabase.mockReset()
    
    // Set up default handling for all run method calls (PRAGMA and regular SQL)
    mockRun.mockImplementation((sql, paramsOrCallback, callback) => {
      // Handle both forms: run(sql, params, callback) and run(sql, callback)
      let actualCallback
      let actualParams
      
      if (typeof paramsOrCallback === 'function') {
        // run(sql, callback)
        actualCallback = paramsOrCallback
        actualParams = []
      } else {
        // run(sql, params, callback)
        actualCallback = callback
        actualParams = paramsOrCallback || []
      }
      
      if (actualCallback && typeof actualCallback === 'function') {
        // For PRAGMA statements, just call callback without error
        if (sql.startsWith('PRAGMA')) {
          actualCallback(null)
        } else {
          // For regular SQL, this will be overridden in individual tests
          actualCallback(null)
        }
      }
    })
    
    logger = (await import('../utils/logger.js')).default
    setupDatabase = (await import('../scripts/setup-database.js')).setupDatabase
    
    // Reset modules to get fresh instance
    vi.resetModules()
    database = await import('./database.js')
  })

  describe('run method', () => {
    it('should execute SQL and return result with lastID and changes', async () => {
      const mockResult = { lastID: 1, changes: 1 }
      mockRun.mockImplementation((sql, paramsOrCallback, callback) => {
        let actualCallback
        
        if (typeof paramsOrCallback === 'function') {
          actualCallback = paramsOrCallback
        } else {
          actualCallback = callback
        }
        
        if (!sql.startsWith('PRAGMA') && actualCallback) {
          actualCallback.call(mockResult, null)
        } else if (actualCallback) {
          actualCallback(null)
        }
      })
      
      const result = await database.run('INSERT INTO test VALUES (?)', ['value'])
      
      expect(mockRun).toHaveBeenCalledWith('INSERT INTO test VALUES (?)', ['value'], expect.any(Function))
      expect(result).toEqual({ id: 1, changes: 1 })
    })

    it('should execute SQL without parameters', async () => {
      const mockResult = { lastID: 2, changes: 1 }
      mockRun.mockImplementation((sql, paramsOrCallback, callback) => {
        let actualCallback
        
        if (typeof paramsOrCallback === 'function') {
          actualCallback = paramsOrCallback
        } else {
          actualCallback = callback
        }
        
        if (!sql.startsWith('PRAGMA') && actualCallback) {
          actualCallback.call(mockResult, null)
        } else if (actualCallback) {
          actualCallback(null)
        }
      })
      
      const result = await database.run('CREATE TABLE test (id INTEGER)')
      
      expect(mockRun).toHaveBeenCalledWith('CREATE TABLE test (id INTEGER)', [], expect.any(Function))
      expect(result).toEqual({ id: 2, changes: 1 })
    })

    it('should reject on database error', async () => {
      const dbError = new Error('SQL error')
      mockRun.mockImplementation((sql, paramsOrCallback, callback) => {
        let actualCallback
        
        if (typeof paramsOrCallback === 'function') {
          actualCallback = paramsOrCallback
        } else {
          actualCallback = callback
        }
        
        if (!sql.startsWith('PRAGMA') && actualCallback) {
          actualCallback(dbError)
        } else if (actualCallback) {
          actualCallback(null)
        }
      })
      
      await expect(database.run('INVALID SQL')).rejects.toThrow('SQL error')
    })
  })

  describe('get method', () => {
    it('should execute SQL and return single row', async () => {
      const mockRow = { id: 1, name: 'test' }
      mockGet.mockImplementation((sql, params, callback) => {
        callback(null, mockRow)
      })
      
      const result = await database.get('SELECT * FROM test WHERE id = ?', [1])
      
      expect(mockGet).toHaveBeenCalledWith('SELECT * FROM test WHERE id = ?', [1], expect.any(Function))
      expect(result).toEqual(mockRow)
    })

    it('should return undefined when no row found', async () => {
      mockGet.mockImplementation((sql, params, callback) => {
        callback(null, undefined)
      })
      
      const result = await database.get('SELECT * FROM test WHERE id = ?', [999])
      
      expect(result).toBeUndefined()
    })

    it('should execute SQL without parameters', async () => {
      const mockRow = { count: 5 }
      mockGet.mockImplementation((sql, params, callback) => {
        callback(null, mockRow)
      })
      
      const result = await database.get('SELECT COUNT(*) as count FROM test')
      
      expect(mockGet).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM test', [], expect.any(Function))
      expect(result).toEqual(mockRow)
    })

    it('should reject on database error', async () => {
      const dbError = new Error('SQL error')
      mockGet.mockImplementation((sql, params, callback) => {
        callback(dbError)
      })
      
      await expect(database.get('INVALID SQL')).rejects.toThrow('SQL error')
    })
  })

  describe('all method', () => {
    it('should execute SQL and return all rows', async () => {
      const mockRows = [
        { id: 1, name: 'test1' },
        { id: 2, name: 'test2' }
      ]
      mockAll.mockImplementation((sql, params, callback) => {
        callback(null, mockRows)
      })
      
      const result = await database.all('SELECT * FROM test')
      
      expect(mockAll).toHaveBeenCalledWith('SELECT * FROM test', [], expect.any(Function))
      expect(result).toEqual(mockRows)
    })

    it('should return empty array when no rows found', async () => {
      mockAll.mockImplementation((sql, params, callback) => {
        callback(null, [])
      })
      
      const result = await database.all('SELECT * FROM empty_table')
      
      expect(result).toEqual([])
    })

    it('should execute SQL with parameters', async () => {
      const mockRows = [{ id: 1, name: 'filtered' }]
      mockAll.mockImplementation((sql, params, callback) => {
        callback(null, mockRows)
      })
      
      const result = await database.all('SELECT * FROM test WHERE name = ?', ['filtered'])
      
      expect(mockAll).toHaveBeenCalledWith('SELECT * FROM test WHERE name = ?', ['filtered'], expect.any(Function))
      expect(result).toEqual(mockRows)
    })

    it('should reject on database error', async () => {
      const dbError = new Error('SQL error')
      mockAll.mockImplementation((sql, params, callback) => {
        callback(dbError)
      })
      
      await expect(database.all('INVALID SQL')).rejects.toThrow('SQL error')
    })
  })

  describe('initializeDatabase', () => {
    it('should call setupDatabase successfully', async () => {
      setupDatabase.mockResolvedValue()
      
      await expect(database.initializeDatabase()).resolves.toBeUndefined()
      
      expect(setupDatabase).toHaveBeenCalledTimes(1)
    })

    it('should handle setupDatabase errors', async () => {
      const setupError = new Error('Setup failed')
      setupDatabase.mockRejectedValue(setupError)
      
      await expect(database.initializeDatabase()).rejects.toThrow('Setup failed')
      
      expect(logger.error).toHaveBeenCalledWith('Database initialization failed:', setupError)
    })
  })

  describe('getDatabase', () => {
    it('should return database instance', () => {
      const db = database.getDatabase()
      expect(db).toBe(mockDb)
    })

    it('should call SQLite Database constructor', () => {
      database.getDatabase()
      expect(mockDatabase).toHaveBeenCalled()
    })
  })
})