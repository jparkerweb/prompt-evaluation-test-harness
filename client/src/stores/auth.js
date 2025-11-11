import { defineStore } from 'pinia'
import api from '@/services/api'
import router from '@/router'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token'),
    isLoading: false,
    error: null
  }),
  
  getters: {
    isAuthenticated: (state) => !!state.token,
    currentUser: (state) => state.user
  },
  
  actions: {
    async login(username, password) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await api.post('/auth/login', { username, password })
        const { token, user } = response.data
        
        this.token = token
        this.user = user
        localStorage.setItem('token', token)
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        
        await router.push('/')
      } catch (error) {
        this.error = error.response?.data?.error?.message || 'Login failed'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async register(username, password) {
      this.isLoading = true
      this.error = null
      
      try {
        await api.post('/auth/register', { username, password })
        // Auto-login after registration
        await this.login(username, password)
      } catch (error) {
        this.error = error.response?.data?.error?.message || 'Registration failed'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async logout() {
      try {
        await api.post('/auth/logout')
      } catch (error) {
        console.error('Logout error:', error)
      }
      
      this.token = null
      this.user = null
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']
      
      await router.push('/login')
    },
    
    async fetchUser() {
      if (!this.token) return
      
      try {
        const response = await api.get('/auth/me')
        this.user = response.data
      } catch (error) {
        console.error('Failed to fetch user:', error)
        if (error.response?.status === 401) {
          await this.logout()
        }
      }
    },
    
    initializeAuth() {
      if (this.token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`
        this.fetchUser()
      }
    }
  }
})