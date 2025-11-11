import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock dependencies before importing
vi.mock('./auth.service.js', () => ({
  default: {
    login: vi.fn(),
    createUser: vi.fn(),
    getUser: vi.fn()
  }
}))

vi.mock('../../middleware/errorHandler.js', () => ({
  AppError: class AppError extends Error {
    constructor(message, statusCode = 500) {
      super(message)
      this.statusCode = statusCode
      this.isOperational = true
    }
  }
}))

describe('AuthController', () => {
  let authController
  let authService
  let mockReq
  let mockRes
  let mockNext
  
  beforeEach(async () => {
    vi.clearAllMocks()
    
    authService = (await import('./auth.service.js')).default
    authController = (await import('./auth.controller.js')).default
    
    mockReq = {
      body: {},
      user: {}
    }
    
    mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis()
    }
    
    mockNext = vi.fn()
  })

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        token: 'jwt-token',
        user: { id: 1, username: 'testuser' }
      }
      
      mockReq.body = { username: 'testuser', password: 'password123' }
      authService.login.mockResolvedValue(loginData)
      
      await authController.login(mockReq, mockRes, mockNext)
      
      expect(authService.login).toHaveBeenCalledWith('testuser', 'password123')
      expect(mockRes.json).toHaveBeenCalledWith(loginData)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should throw error when username is missing', async () => {
      mockReq.body = { password: 'password123' }
      
      await authController.login(mockReq, mockRes, mockNext)
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Username and password are required',
          statusCode: 400
        })
      )
      expect(authService.login).not.toHaveBeenCalled()
      expect(mockRes.json).not.toHaveBeenCalled()
    })

    it('should throw error when password is missing', async () => {
      mockReq.body = { username: 'testuser' }
      
      await authController.login(mockReq, mockRes, mockNext)
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Username and password are required',
          statusCode: 400
        })
      )
      expect(authService.login).not.toHaveBeenCalled()
      expect(mockRes.json).not.toHaveBeenCalled()
    })

    it('should throw error when both username and password are missing', async () => {
      mockReq.body = {}
      
      await authController.login(mockReq, mockRes, mockNext)
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Username and password are required',
          statusCode: 400
        })
      )
      expect(authService.login).not.toHaveBeenCalled()
    })

    it('should handle service errors', async () => {
      const serviceError = new Error('Invalid credentials')
      mockReq.body = { username: 'testuser', password: 'wrongpassword' }
      authService.login.mockRejectedValue(serviceError)
      
      await authController.login(mockReq, mockRes, mockNext)
      
      expect(authService.login).toHaveBeenCalledWith('testuser', 'wrongpassword')
      expect(mockNext).toHaveBeenCalledWith(serviceError)
      expect(mockRes.json).not.toHaveBeenCalled()
    })

    it('should handle empty string username and password', async () => {
      mockReq.body = { username: '', password: '' }
      
      await authController.login(mockReq, mockRes, mockNext)
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Username and password are required',
          statusCode: 400
        })
      )
      expect(authService.login).not.toHaveBeenCalled()
    })
  })

  describe('register', () => {
    it('should register user successfully', async () => {
      const userData = { id: 1, username: 'newuser' }
      mockReq.body = { username: 'newuser', password: 'password123' }
      authService.createUser.mockResolvedValue(userData)
      
      await authController.register(mockReq, mockRes, mockNext)
      
      expect(authService.createUser).toHaveBeenCalledWith('newuser', 'password123')
      expect(mockRes.status).toHaveBeenCalledWith(201)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User created successfully',
        user: userData
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should throw error when username is missing', async () => {
      mockReq.body = { password: 'password123' }
      
      await authController.register(mockReq, mockRes, mockNext)
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Username and password are required',
          statusCode: 400
        })
      )
      expect(authService.createUser).not.toHaveBeenCalled()
    })

    it('should throw error when password is missing', async () => {
      mockReq.body = { username: 'newuser' }
      
      await authController.register(mockReq, mockRes, mockNext)
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Username and password are required',
          statusCode: 400
        })
      )
      expect(authService.createUser).not.toHaveBeenCalled()
    })

    it('should throw error when password is too short', async () => {
      mockReq.body = { username: 'newuser', password: '12345' }
      
      await authController.register(mockReq, mockRes, mockNext)
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Password must be at least 6 characters',
          statusCode: 400
        })
      )
      expect(authService.createUser).not.toHaveBeenCalled()
    })

    it('should accept password with exactly 6 characters', async () => {
      const userData = { id: 1, username: 'newuser' }
      mockReq.body = { username: 'newuser', password: '123456' }
      authService.createUser.mockResolvedValue(userData)
      
      await authController.register(mockReq, mockRes, mockNext)
      
      expect(authService.createUser).toHaveBeenCalledWith('newuser', '123456')
      expect(mockRes.status).toHaveBeenCalledWith(201)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle service errors', async () => {
      const serviceError = new Error('Username already exists')
      mockReq.body = { username: 'existinguser', password: 'password123' }
      authService.createUser.mockRejectedValue(serviceError)
      
      await authController.register(mockReq, mockRes, mockNext)
      
      expect(authService.createUser).toHaveBeenCalledWith('existinguser', 'password123')
      expect(mockNext).toHaveBeenCalledWith(serviceError)
      expect(mockRes.json).not.toHaveBeenCalled()
    })

    it('should handle empty strings', async () => {
      mockReq.body = { username: '', password: '' }
      
      await authController.register(mockReq, mockRes, mockNext)
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Username and password are required',
          statusCode: 400
        })
      )
      expect(authService.createUser).not.toHaveBeenCalled()
    })
  })

  describe('logout', () => {
    it('should return success message', async () => {
      await authController.logout(mockReq, mockRes)
      
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Logged out successfully' })
    })

    it('should not call next or throw errors', async () => {
      await authController.logout(mockReq, mockRes, mockNext)
      
      expect(mockNext).not.toHaveBeenCalled()
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Logged out successfully' })
    })
  })

  describe('getMe', () => {
    it('should return current user data', async () => {
      const userData = { id: 1, username: 'testuser', created_at: '2023-01-01' }
      mockReq.user = { id: 1, username: 'testuser' }
      authService.getUser.mockResolvedValue(userData)
      
      await authController.getMe(mockReq, mockRes, mockNext)
      
      expect(authService.getUser).toHaveBeenCalledWith(1)
      expect(mockRes.json).toHaveBeenCalledWith(userData)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle service errors', async () => {
      const serviceError = new Error('User not found')
      mockReq.user = { id: 999, username: 'nonexistent' }
      authService.getUser.mockRejectedValue(serviceError)
      
      await authController.getMe(mockReq, mockRes, mockNext)
      
      expect(authService.getUser).toHaveBeenCalledWith(999)
      expect(mockNext).toHaveBeenCalledWith(serviceError)
      expect(mockRes.json).not.toHaveBeenCalled()
    })

    it('should pass user ID from request', async () => {
      const userData = { id: 42, username: 'specificuser', created_at: '2023-01-01' }
      mockReq.user = { id: 42, username: 'specificuser' }
      authService.getUser.mockResolvedValue(userData)
      
      await authController.getMe(mockReq, mockRes, mockNext)
      
      expect(authService.getUser).toHaveBeenCalledWith(42)
      expect(mockRes.json).toHaveBeenCalledWith(userData)
    })
  })
})