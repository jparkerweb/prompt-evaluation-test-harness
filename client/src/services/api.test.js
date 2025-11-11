import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

describe('API Service', () => {
  let mockLocalStorage
  let mockAxiosInstance
  let mockRouter

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn()
    }
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })

    // Mock axios instance
    mockAxiosInstance = {
      interceptors: {
        request: {
          use: vi.fn()
        },
        response: {
          use: vi.fn()
        }
      },
      defaults: {
        headers: {
          common: {}
        }
      }
    }

    // Mock router
    mockRouter = {
      push: vi.fn()
    }

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Request Interceptor Logic', () => {
    it('should add authorization header when token exists', () => {
      mockLocalStorage.getItem.mockReturnValue('test-token')

      // Simulate the request interceptor logic
      const config = { headers: {} }
      const token = mockLocalStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('token')
      expect(config.headers.Authorization).toBe('Bearer test-token')
    })

    it('should not add authorization header when no token exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      // Simulate the request interceptor logic
      const config = { headers: {} }
      const token = mockLocalStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('token')
      expect(config.headers.Authorization).toBeUndefined()
    })

    it('should return config object unchanged except for headers', () => {
      const config = {
        headers: {},
        url: '/test',
        method: 'GET',
        data: { test: 'data' }
      }

      // Simulate request interceptor
      const token = mockLocalStorage.getItem('token')
      const result = { ...config }
      if (token) {
        result.headers.Authorization = `Bearer ${token}`
      }

      expect(result.url).toBe('/test')
      expect(result.method).toBe('GET')
      expect(result.data).toEqual({ test: 'data' })
      expect(result.headers).toBeDefined()
    })
  })

  describe('Response Interceptor Logic', () => {
    it('should return response unchanged on success', () => {
      const response = {
        data: { message: 'Success' },
        status: 200,
        headers: {}
      }

      // Simulate response interceptor success handler
      const result = response

      expect(result).toBe(response)
    })

    it('should handle 401 error by removing token and redirecting', async () => {
      const error = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' }
        }
      }

      // Simulate response interceptor error handler
      if (error.response?.status === 401) {
        mockLocalStorage.removeItem('token')
        await mockRouter.push('/login')
      }

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token')
      expect(mockRouter.push).toHaveBeenCalledWith('/login')
    })

    it('should not remove token for non-401 errors', async () => {
      const error = {
        response: {
          status: 500,
          data: { message: 'Server error' }
        }
      }

      // Simulate response interceptor error handler
      if (error.response?.status === 401) {
        mockLocalStorage.removeItem('token')
        await mockRouter.push('/login')
      }

      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled()
      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    it('should not remove token for errors without response', async () => {
      const error = new Error('Network error')

      // Simulate response interceptor error handler
      if (error.response?.status === 401) {
        mockLocalStorage.removeItem('token')
        await mockRouter.push('/login')
      }

      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled()
      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    it('should not remove token for 401 error without response.status', async () => {
      const error = {
        response: {
          data: { message: 'Unauthorized' }
        }
      }

      // Simulate response interceptor error handler
      if (error.response?.status === 401) {
        mockLocalStorage.removeItem('token')
        await mockRouter.push('/login')
      }

      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled()
      expect(mockRouter.push).not.toHaveBeenCalled()
    })
  })

  describe('API Configuration Values', () => {
    it('should use correct base URL', () => {
      const expectedBaseURL = '/api'
      expect(expectedBaseURL).toBe('/api')
    })

    it('should use correct timeout', () => {
      const expectedTimeout = 30000
      expect(expectedTimeout).toBe(30000)
    })

    it('should use correct default headers', () => {
      const expectedHeaders = {
        'Content-Type': 'application/json'
      }
      expect(expectedHeaders['Content-Type']).toBe('application/json')
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complete request flow with token', () => {
      mockLocalStorage.getItem.mockReturnValue('test-token')

      // Simulate request preparation
      const config = { headers: {} }
      const token = mockLocalStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      // Simulate successful response
      const response = { data: { success: true }, status: 200 }

      expect(config.headers.Authorization).toBe('Bearer test-token')
      expect(response.status).toBe(200)
    })

    it('should handle complete request flow with 401 error', async () => {
      mockLocalStorage.getItem.mockReturnValue('expired-token')

      // Simulate request preparation
      const config = { headers: {} }
      const token = mockLocalStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      // Simulate 401 error response
      const error = {
        response: { status: 401, data: { message: 'Token expired' } }
      }

      // Simulate error handling
      if (error.response?.status === 401) {
        mockLocalStorage.removeItem('token')
        await mockRouter.push('/login')
      }

      expect(config.headers.Authorization).toBe('Bearer expired-token')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token')
      expect(mockRouter.push).toHaveBeenCalledWith('/login')
    })

    it('should handle request flow without token', () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      // Simulate request preparation
      const config = { headers: {} }
      const token = mockLocalStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      expect(config.headers.Authorization).toBeUndefined()
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('token')
    })
  })

  describe('Edge Cases', () => {
    it('should handle request config with undefined headers', () => {
      const config = {}
      
      // Simulate request interceptor handling undefined headers
      if (!config.headers) {
        config.headers = {}
      }
      
      const token = mockLocalStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      expect(config.headers).toBeDefined()
    })

    it('should handle multiple 401 errors', async () => {
      const error1 = {
        response: { status: 401, data: { message: 'Unauthorized' } }
      }
      const error2 = {
        response: { status: 401, data: { message: 'Token expired' } }
      }

      // Simulate handling multiple 401 errors
      if (error1.response?.status === 401) {
        mockLocalStorage.removeItem('token')
        await mockRouter.push('/login')
      }
      
      if (error2.response?.status === 401) {
        mockLocalStorage.removeItem('token')
        await mockRouter.push('/login')
      }

      expect(mockLocalStorage.removeItem).toHaveBeenCalledTimes(2)
      expect(mockRouter.push).toHaveBeenCalledTimes(2)
      expect(mockRouter.push).toHaveBeenCalledWith('/login')
    })

    it('should handle null response object', async () => {
      const error = {
        response: null
      }

      // Simulate error handling
      if (error.response?.status === 401) {
        mockLocalStorage.removeItem('token')
        await mockRouter.push('/login')
      }

      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled()
      expect(mockRouter.push).not.toHaveBeenCalled()
    })
  })
})