import { describe, it, expect } from 'vitest'
import { parseBoolean, paginate, formatErrorResponse } from './helpers.js'

describe('Helpers', () => {
  describe('parseBoolean', () => {
    it('should return true for boolean true', () => {
      expect(parseBoolean(true)).toBe(true)
    })
    
    it('should return false for boolean false', () => {
      expect(parseBoolean(false)).toBe(false)
    })
    
    it('should return true for string "true"', () => {
      expect(parseBoolean('true')).toBe(true)
      expect(parseBoolean('TRUE')).toBe(true)
      expect(parseBoolean('True')).toBe(true)
    })
    
    it('should return false for string "false"', () => {
      expect(parseBoolean('false')).toBe(false)
      expect(parseBoolean('FALSE')).toBe(false)
      expect(parseBoolean('False')).toBe(false)
    })
    
    it('should return null for invalid values', () => {
      expect(parseBoolean('yes')).toBe(null)
      expect(parseBoolean(1)).toBe(null)
      expect(parseBoolean(0)).toBe(null)
      expect(parseBoolean(null)).toBe(null)
      expect(parseBoolean(undefined)).toBe(null)
    })
  })
  
  describe('paginate', () => {
    it('should return default pagination', () => {
      const result = paginate()
      expect(result).toEqual({ limit: 50, offset: 0 })
    })
    
    it('should calculate offset correctly', () => {
      expect(paginate(1, 10)).toEqual({ limit: 10, offset: 0 })
      expect(paginate(2, 10)).toEqual({ limit: 10, offset: 10 })
      expect(paginate(3, 10)).toEqual({ limit: 10, offset: 20 })
    })
    
    it('should respect MAX_PAGE_SIZE', () => {
      const originalMaxPageSize = process.env.MAX_PAGE_SIZE
      process.env.MAX_PAGE_SIZE = '20'
      
      expect(paginate(1, 100)).toEqual({ limit: 20, offset: 0 })
      
      process.env.MAX_PAGE_SIZE = originalMaxPageSize
    })
  })
  
  describe('formatErrorResponse', () => {
    it('should format error with message and status', () => {
      const error = { message: 'Test error', statusCode: 404 }
      expect(formatErrorResponse(error)).toEqual({
        error: {
          message: 'Test error',
          status: 404
        }
      })
    })
    
    it('should use defaults for missing values', () => {
      expect(formatErrorResponse({})).toEqual({
        error: {
          message: 'An error occurred',
          status: 500
        }
      })
    })
  })
})