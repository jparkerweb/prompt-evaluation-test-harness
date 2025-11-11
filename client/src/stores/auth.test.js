import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import { useAuthStore } from './auth'
import api from '@/services/api'
import router from '@/router'

// Mock the API service
vi.mock('@/services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    defaults: {
      headers: {
        common: {}
      }
    }
  }
}))

// Mock the router
vi.mock('@/router', () => ({
  default: {
    push: vi.fn()
  }
}))

describe('Auth Store', () => {
  let store
  let mockLocalStorage

  beforeEach(() => {
    // Mock localStorage first
    mockLocalStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn()
    }
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })

    // Create a fresh Pinia instance for each test
    setActivePinia(createPinia())

    // Initialize store
    store = useAuthStore()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.user).toBeNull()
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should get token from localStorage on initialization', () => {
      mockLocalStorage.getItem.mockReturnValue('test-token')
      
      // Create new pinia instance and store to test initialization
      setActivePinia(createPinia())
      const newStore = useAuthStore()
      expect(newStore.token).toBe('test-token')
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('token')
    })
  })

  describe('Getters', () => {
    it('should return correct isAuthenticated status when token exists', () => {
      store.token = 'test-token'
      expect(store.isAuthenticated).toBe(true)
    })

    it('should return false for isAuthenticated when no token', () => {
      store.token = null
      expect(store.isAuthenticated).toBe(false)
    })

    it('should return correct currentUser', () => {
      const user = { id: 1, username: 'testuser' }
      store.user = user
      expect(store.currentUser).toEqual(user)
    })
  })

  describe('Login Action', () => {
    it('should login successfully with valid credentials', async () => {
      const mockResponse = {
        data: {
          token: 'new-token',
          user: { id: 1, username: 'testuser' }
        }
      }
      api.post.mockResolvedValue(mockResponse)

      await store.login('testuser', 'password')

      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        username: 'testuser',
        password: 'password'
      })
      expect(store.token).toBe('new-token')
      expect(store.user).toEqual({ id: 1, username: 'testuser' })
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'new-token')
      expect(api.defaults.headers.common['Authorization']).toBe('Bearer new-token')
      expect(router.push).toHaveBeenCalledWith('/')
    })

    it('should handle login error', async () => {
      // Ensure store is properly initialized
      expect(store.isLoading).toBe(false) // Initial state should be false
      
      const mockError = {
        response: {
          data: {
            error: {
              message: 'Invalid credentials'
            }
          }
        }
      }
      api.post.mockRejectedValue(mockError)

      await expect(store.login('testuser', 'wrongpassword')).rejects.toThrow()

      expect(store.error).toBe('Invalid credentials')
      expect(store.token).toBeNull()
      expect(store.user).toBeNull()
      expect(store.isLoading).toBe(false)
    })

    it('should handle login error without specific message', async () => {
      const mockError = new Error('Network error')
      api.post.mockRejectedValue(mockError)

      await expect(store.login('testuser', 'password')).rejects.toThrow()

      expect(store.error).toBe('Login failed')
      expect(store.isLoading).toBe(false)
    })

    it('should set loading state during login', async () => {
      api.post.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: { token: 'token', user: {} } }), 100)))
      
      const loginPromise = store.login('testuser', 'password')
      
      expect(store.isLoading).toBe(true)
      
      await loginPromise
      
      expect(store.isLoading).toBe(false)
    })
  })

  describe('Register Action', () => {
    it('should register and auto-login successfully', async () => {
      const mockRegisterResponse = { data: { success: true } }
      const mockLoginResponse = {
        data: {
          token: 'new-token',
          user: { id: 1, username: 'newuser' }
        }
      }
      
      api.post.mockImplementation((url) => {
        if (url === '/auth/register') {
          return Promise.resolve(mockRegisterResponse)
        } else if (url === '/auth/login') {
          return Promise.resolve(mockLoginResponse)
        }
      })

      await store.register('newuser', 'password')

      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        username: 'newuser',
        password: 'password'
      })
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        username: 'newuser',
        password: 'password'
      })
      expect(store.token).toBe('new-token')
      expect(store.user).toEqual({ id: 1, username: 'newuser' })
      expect(store.isLoading).toBe(false)
    })

    it('should handle registration error', async () => {
      const mockError = {
        response: {
          data: {
            error: {
              message: 'Username already exists'
            }
          }
        }
      }
      api.post.mockRejectedValue(mockError)

      await expect(store.register('testuser', 'password')).rejects.toThrow()

      expect(store.error).toBe('Username already exists')
      expect(store.isLoading).toBe(false)
    })

    it('should handle registration error without specific message', async () => {
      const mockError = new Error('Network error')
      api.post.mockRejectedValue(mockError)

      await expect(store.register('testuser', 'password')).rejects.toThrow()

      expect(store.error).toBe('Registration failed')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('Logout Action', () => {
    it('should logout successfully', async () => {
      // Setup initial authenticated state
      store.token = 'test-token'
      store.user = { id: 1, username: 'testuser' }
      api.defaults.headers.common['Authorization'] = 'Bearer test-token'

      api.post.mockResolvedValue({ data: { success: true } })

      await store.logout()

      expect(api.post).toHaveBeenCalledWith('/auth/logout')
      expect(store.token).toBeNull()
      expect(store.user).toBeNull()
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token')
      expect(api.defaults.headers.common['Authorization']).toBeUndefined()
      expect(router.push).toHaveBeenCalledWith('/login')
    })

    it('should clear state even if logout API call fails', async () => {
      store.token = 'test-token'
      store.user = { id: 1, username: 'testuser' }

      api.post.mockRejectedValue(new Error('Server error'))

      await store.logout()

      expect(store.token).toBeNull()
      expect(store.user).toBeNull()
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token')
      expect(router.push).toHaveBeenCalledWith('/login')
    })
  })

  describe('FetchUser Action', () => {
    it('should fetch user data when token exists', async () => {
      store.token = 'test-token'
      const mockResponse = {
        data: { id: 1, username: 'testuser', email: 'test@example.com' }
      }
      api.get.mockResolvedValue(mockResponse)

      await store.fetchUser()

      expect(api.get).toHaveBeenCalledWith('/auth/me')
      expect(store.user).toEqual(mockResponse.data)
    })

    it('should not fetch user data when no token exists', async () => {
      store.token = null

      await store.fetchUser()

      expect(api.get).not.toHaveBeenCalled()
    })

    it('should handle 401 error by logging out', async () => {
      store.token = 'invalid-token'
      const mockError = {
        response: { status: 401 }
      }
      api.get.mockRejectedValue(mockError)

      // Mock the logout method to track if it's called
      const logoutSpy = vi.spyOn(store, 'logout').mockImplementation(() => Promise.resolve())

      await store.fetchUser()

      expect(logoutSpy).toHaveBeenCalled()
    })

    it('should handle other fetch user errors', async () => {
      store.token = 'test-token'
      const mockError = new Error('Server error')
      api.get.mockRejectedValue(mockError)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await store.fetchUser()

      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch user:', mockError)
      
      consoleSpy.mockRestore()
    })
  })

  describe('InitializeAuth Action', () => {
    it('should set authorization header and fetch user when token exists', async () => {
      store.token = 'test-token'
      const fetchUserSpy = vi.spyOn(store, 'fetchUser').mockImplementation(() => Promise.resolve())

      store.initializeAuth()

      expect(api.defaults.headers.common['Authorization']).toBe('Bearer test-token')
      expect(fetchUserSpy).toHaveBeenCalled()
    })

    it('should not set authorization header when no token exists', async () => {
      store.token = null
      // Clear any existing authorization header
      delete api.defaults.headers.common['Authorization']
      const fetchUserSpy = vi.spyOn(store, 'fetchUser').mockImplementation(() => Promise.resolve())

      store.initializeAuth()

      expect(api.defaults.headers.common['Authorization']).toBeUndefined()
      expect(fetchUserSpy).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should clear error when starting new login', async () => {
      store.error = 'Previous error'
      api.post.mockImplementation(() => new Promise(() => {})) // Never resolves

      store.login('testuser', 'password')

      expect(store.error).toBeNull()
    })

    it('should clear error when starting new register', async () => {
      store.error = 'Previous error'
      api.post.mockImplementation(() => new Promise(() => {})) // Never resolves

      store.register('testuser', 'password')

      expect(store.error).toBeNull()
    })
  })

  describe('Loading States', () => {
    it('should manage loading state during login', async () => {
      let resolveLogin
      api.post.mockImplementation(() => new Promise(resolve => {
        resolveLogin = resolve
      }))

      const loginPromise = store.login('testuser', 'password')
      
      expect(store.isLoading).toBe(true)
      
      resolveLogin({ data: { token: 'token', user: {} } })
      await loginPromise
      
      expect(store.isLoading).toBe(false)
    })

    it('should manage loading state during register', async () => {
      let resolveRegister, resolveLogin
      api.post.mockImplementation((url) => {
        if (url === '/auth/register') {
          return new Promise(resolve => {
            resolveRegister = resolve
          })
        } else if (url === '/auth/login') {
          return new Promise(resolve => {
            resolveLogin = resolve
          })
        }
      })

      const registerPromise = store.register('testuser', 'password')
      
      expect(store.isLoading).toBe(true)
      
      // Resolve register first
      resolveRegister({ data: { success: true } })
      
      // Then resolve login (which gets called after register)  
      setTimeout(() => {
        resolveLogin({ data: { token: 'token', user: {} } })
      }, 0)
      
      await registerPromise
      
      expect(store.isLoading).toBe(false)
    })
  })
})