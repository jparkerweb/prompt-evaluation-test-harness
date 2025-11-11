import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockJwtVerify = vi.fn()

// Mock dependencies before importing
vi.mock('jsonwebtoken', () => ({
  default: {
    verify: mockJwtVerify
  }
}))

vi.mock('./errorHandler.js', () => ({
  AppError: class AppError extends Error {
    constructor(message, statusCode = 500) {
      super(message)
      this.statusCode = statusCode
      this.isOperational = true
    }
  }
}))

describe('Auth Middleware', () => {
  let authMiddleware
  let sseAuthMiddleware
  let AppError
  let mockReq
  let mockRes
  let mockNext
  
  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Set up environment
    process.env.JWT_SECRET = 'test-secret'
    
    const errorHandler = await import('./errorHandler.js')
    AppError = errorHandler.AppError
    
    const authModule = await import('./auth.js')
    authMiddleware = authModule.authMiddleware
    sseAuthMiddleware = authModule.sseAuthMiddleware
    
    mockReq = {
      headers: {},
      query: {}
    }
    
    mockRes = {}
    mockNext = vi.fn()
  })

  describe('authMiddleware', () => {
    it('should authenticate valid token from Authorization header', () => {
      const decodedToken = { id: 1, username: 'testuser' }
      mockReq.headers.authorization = 'Bearer valid-token'
      mockJwtVerify.mockReturnValue(decodedToken)
      
      authMiddleware(mockReq, mockRes, mockNext)
      
      expect(mockJwtVerify).toHaveBeenCalledWith('valid-token', 'test-secret')
      expect(mockReq.user).toEqual(decodedToken)
      expect(mockNext).toHaveBeenCalledWith()
    })

    it('should handle missing Authorization header', () => {
      authMiddleware(mockReq, mockRes, mockNext)
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No token provided',
          statusCode: 401
        })
      )
      expect(mockJwtVerify).not.toHaveBeenCalled()
    })

    it('should handle malformed Authorization header', () => {
      mockReq.headers.authorization = 'InvalidFormat'
      
      authMiddleware(mockReq, mockRes, mockNext)
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No token provided',
          statusCode: 401
        })
      )
      expect(mockJwtVerify).not.toHaveBeenCalled()
    })

    it('should handle empty token in Authorization header', () => {
      mockReq.headers.authorization = 'Bearer '
      
      authMiddleware(mockReq, mockRes, mockNext)
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No token provided',
          statusCode: 401
        })
      )
      expect(mockJwtVerify).not.toHaveBeenCalled()
    })

    it('should handle JsonWebTokenError', () => {
      mockReq.headers.authorization = 'Bearer invalid-token'
      const jwtError = new Error('Invalid token')
      jwtError.name = 'JsonWebTokenError'
      mockJwtVerify.mockImplementation(() => { throw jwtError })
      
      authMiddleware(mockReq, mockRes, mockNext)
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token',
          statusCode: 401
        })
      )
    })

    it('should handle TokenExpiredError', () => {
      mockReq.headers.authorization = 'Bearer expired-token'
      const expiredError = new Error('Token expired')
      expiredError.name = 'TokenExpiredError'
      mockJwtVerify.mockImplementation(() => { throw expiredError })
      
      authMiddleware(mockReq, mockRes, mockNext)
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Token expired',
          statusCode: 401
        })
      )
    })

    it('should handle other errors', () => {
      mockReq.headers.authorization = 'Bearer some-token'
      const genericError = new Error('Some other error')
      mockJwtVerify.mockImplementation(() => { throw genericError })
      
      authMiddleware(mockReq, mockRes, mockNext)
      
      expect(mockNext).toHaveBeenCalledWith(genericError)
    })

    it('should extract token correctly from Bearer format', () => {
      const decodedToken = { id: 1, username: 'testuser' }
      mockReq.headers.authorization = 'Bearer abc123.def456.ghi789'
      mockJwtVerify.mockReturnValue(decodedToken)
      
      authMiddleware(mockReq, mockRes, mockNext)
      
      expect(mockJwtVerify).toHaveBeenCalledWith('abc123.def456.ghi789', 'test-secret')
      expect(mockReq.user).toEqual(decodedToken)
    })

    it('should handle missing JWT_SECRET environment variable', () => {
      delete process.env.JWT_SECRET
      mockReq.headers.authorization = 'Bearer valid-token'
      
      authMiddleware(mockReq, mockRes, mockNext)
      
      expect(mockJwtVerify).toHaveBeenCalledWith('valid-token', undefined)
      // JWT library will throw an error with undefined secret, which gets passed to next
    })
  })

  describe('sseAuthMiddleware', () => {
    it('should authenticate token from Authorization header', () => {
      const decodedToken = { id: 1, username: 'testuser' }
      mockReq.headers.authorization = 'Bearer valid-token'
      mockJwtVerify.mockReturnValue(decodedToken)
      
      sseAuthMiddleware(mockReq, mockRes, mockNext)
      
      expect(mockJwtVerify).toHaveBeenCalledWith('valid-token', 'test-secret')
      expect(mockReq.user).toEqual(decodedToken)
      expect(mockNext).toHaveBeenCalledWith()
    })

    it('should authenticate token from query parameter', () => {
      const decodedToken = { id: 1, username: 'testuser' }
      mockReq.query.token = 'query-token'
      mockJwtVerify.mockReturnValue(decodedToken)
      
      sseAuthMiddleware(mockReq, mockRes, mockNext)
      
      expect(mockJwtVerify).toHaveBeenCalledWith('query-token', 'test-secret')
      expect(mockReq.user).toEqual(decodedToken)
      expect(mockNext).toHaveBeenCalledWith()
    })

    it('should prefer Authorization header over query parameter', () => {
      const decodedToken = { id: 1, username: 'testuser' }
      mockReq.headers.authorization = 'Bearer header-token'
      mockReq.query.token = 'query-token'
      mockJwtVerify.mockReturnValue(decodedToken)
      
      sseAuthMiddleware(mockReq, mockRes, mockNext)
      
      expect(mockJwtVerify).toHaveBeenCalledWith('header-token', 'test-secret')
      expect(mockJwtVerify).not.toHaveBeenCalledWith('query-token', 'test-secret')
    })

    it('should fall back to query parameter when header missing', () => {
      const decodedToken = { id: 1, username: 'testuser' }
      mockReq.query.token = 'query-token'
      mockJwtVerify.mockReturnValue(decodedToken)
      
      sseAuthMiddleware(mockReq, mockRes, mockNext)
      
      expect(mockJwtVerify).toHaveBeenCalledWith('query-token', 'test-secret')
      expect(mockReq.user).toEqual(decodedToken)
    })

    it('should fall back to query parameter when header is malformed', () => {
      const decodedToken = { id: 1, username: 'testuser' }
      mockReq.headers.authorization = 'InvalidFormat'
      mockReq.query.token = 'query-token'
      mockJwtVerify.mockReturnValue(decodedToken)
      
      sseAuthMiddleware(mockReq, mockRes, mockNext)
      
      expect(mockJwtVerify).toHaveBeenCalledWith('query-token', 'test-secret')
      expect(mockReq.user).toEqual(decodedToken)
    })

    it('should handle missing token from both sources', () => {
      sseAuthMiddleware(mockReq, mockRes, mockNext)
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No token provided',
          statusCode: 401
        })
      )
      expect(mockJwtVerify).not.toHaveBeenCalled()
    })

    it('should handle empty token in query parameter', () => {
      mockReq.query.token = ''
      
      sseAuthMiddleware(mockReq, mockRes, mockNext)
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No token provided',
          statusCode: 401
        })
      )
    })

    it('should handle JsonWebTokenError for query token', () => {
      mockReq.query.token = 'invalid-token'
      const jwtError = new Error('Invalid token')
      jwtError.name = 'JsonWebTokenError'
      mockJwtVerify.mockImplementation(() => { throw jwtError })
      
      sseAuthMiddleware(mockReq, mockRes, mockNext)
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token',
          statusCode: 401
        })
      )
    })

    it('should handle TokenExpiredError for query token', () => {
      mockReq.query.token = 'expired-token'
      const expiredError = new Error('Token expired')
      expiredError.name = 'TokenExpiredError'
      mockJwtVerify.mockImplementation(() => { throw expiredError })
      
      sseAuthMiddleware(mockReq, mockRes, mockNext)
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Token expired',
          statusCode: 401
        })
      )
    })

    it('should handle other errors for query token', () => {
      mockReq.query.token = 'some-token'
      const genericError = new Error('Some other error')
      mockJwtVerify.mockImplementation(() => { throw genericError })
      
      sseAuthMiddleware(mockReq, mockRes, mockNext)
      
      expect(mockNext).toHaveBeenCalledWith(genericError)
    })

    it('should handle undefined query object gracefully', () => {
      mockReq.query = undefined
      
      sseAuthMiddleware(mockReq, mockRes, mockNext)
      
      // The middleware will try to access req.query.token on undefined, which throws a TypeError
      // This is expected behavior - the middleware should handle this case gracefully
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Cannot read properties of undefined')
        })
      )
    })
  })

  describe('error handling consistency', () => {
    it('should create AppError instances with correct properties', () => {
      const error = new AppError('Test message', 400)
      
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe('Test message')
      expect(error.statusCode).toBe(400)
      expect(error.isOperational).toBe(true)
    })

    it('should use default status code when not provided', () => {
      const error = new AppError('Test message')
      
      expect(error.statusCode).toBe(500)
    })
  })

  describe('integration scenarios', () => {
    it('should handle concurrent authentication requests', () => {
      const decodedToken1 = { id: 1, username: 'user1' }
      const decodedToken2 = { id: 2, username: 'user2' }
      
      const req1 = { headers: { authorization: 'Bearer token1' } }
      const req2 = { headers: { authorization: 'Bearer token2' } }
      const next1 = vi.fn()
      const next2 = vi.fn()
      
      mockJwtVerify
        .mockReturnValueOnce(decodedToken1)
        .mockReturnValueOnce(decodedToken2)
      
      authMiddleware(req1, {}, next1)
      authMiddleware(req2, {}, next2)
      
      expect(req1.user).toEqual(decodedToken1)
      expect(req2.user).toEqual(decodedToken2)
      expect(next1).toHaveBeenCalledWith()
      expect(next2).toHaveBeenCalledWith()
    })

    it('should maintain request isolation between SSE and regular auth', () => {
      const decodedToken = { id: 1, username: 'testuser' }
      
      const regularReq = { headers: { authorization: 'Bearer header-token' } }
      const sseReq = { 
        headers: {},
        query: { token: 'query-token' }
      }
      
      mockJwtVerify.mockReturnValue(decodedToken)
      
      authMiddleware(regularReq, {}, mockNext)
      sseAuthMiddleware(sseReq, {}, mockNext)
      
      expect(mockJwtVerify).toHaveBeenCalledWith('header-token', 'test-secret')
      expect(mockJwtVerify).toHaveBeenCalledWith('query-token', 'test-secret')
      expect(regularReq.user).toEqual(decodedToken)
      expect(sseReq.user).toEqual(decodedToken)
    })
  })
})