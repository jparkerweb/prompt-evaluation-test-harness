import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock dependencies before importing the service
vi.mock('../../config/database.js', () => ({
  run: vi.fn(),
  get: vi.fn()
}))

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn()
  },
  hash: vi.fn(),
  compare: vi.fn()
}))

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn()
  },
  sign: vi.fn()
}))

describe('AuthService', () => {
  let authService
  let database
  let bcrypt
  let jwt
  
  beforeEach(async () => {
    vi.clearAllMocks()
    process.env.JWT_SECRET = 'test-secret'
    process.env.JWT_EXPIRES_IN = '24h'
    
    // Clear module cache and re-import to ensure fresh mocks
    vi.resetModules()
    
    database = await import('../../config/database.js')
    bcrypt = await import('bcrypt')
    jwt = await import('jsonwebtoken')
    authService = (await import('./auth.service.js')).default
  })
  
  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const username = 'newtestuser'
      const password = 'password123'
      const hashedPassword = 'hashed-password'
      const userId = 1
      
      database.get.mockResolvedValue(null) // User doesn't exist
      bcrypt.default.hash.mockResolvedValue(hashedPassword)
      database.run.mockResolvedValue({ id: userId, changes: 1 })
      
      const result = await authService.createUser(username, password)
      
      expect(database.get).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE username = ?',
        [username]
      )
      expect(bcrypt.default.hash).toHaveBeenCalledWith(password, 10)
      expect(database.run).toHaveBeenCalledWith(
        'INSERT INTO users (username, password_hash) VALUES (?, ?)',
        [username, hashedPassword]
      )
      expect(result).toEqual({ id: userId, username })
    })
    
    it('should throw error if username already exists', async () => {
      const username = 'existinguser'
      const password = 'password123'
      
      database.get.mockResolvedValue({ id: 1 }) // User exists
      
      await expect(authService.createUser(username, password))
        .rejects.toThrow('Username already exists')
    })
  })
  
  describe('login', () => {
    it('should login user successfully', async () => {
      const username = 'testuser'
      const password = 'password123'
      const user = {
        id: 1,
        username,
        password_hash: 'hashed-password'
      }
      const token = 'jwt-token'
      
      database.get.mockResolvedValue(user)
      bcrypt.default.compare.mockResolvedValue(true)
      jwt.default.sign.mockReturnValue(token)
      
      const result = await authService.login(username, password)
      
      expect(database.get).toHaveBeenCalledWith(
        'SELECT id, username, password_hash FROM users WHERE username = ?',
        [username]
      )
      expect(bcrypt.default.compare).toHaveBeenCalledWith(password, user.password_hash)
      expect(jwt.default.sign).toHaveBeenCalledWith(
        { id: user.id, username: user.username },
        'test-secret',
        { expiresIn: '24h' }
      )
      expect(result).toEqual({
        token,
        user: { id: user.id, username: user.username }
      })
    })
    
    it('should throw error for invalid credentials', async () => {
      const username = 'testuser'
      const password = 'wrongpassword'
      
      database.get.mockResolvedValue(null) // User not found
      
      await expect(authService.login(username, password))
        .rejects.toThrow('Invalid credentials')
    })
  })
})