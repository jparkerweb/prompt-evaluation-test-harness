<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <div class="flex flex-col items-center">
          <img src="/assets/score.png" alt="Score" class="h-12 w-12 mb-4">
          <h2 class="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Prompt Evaluation Test Harness
          </h2>
        </div>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          {{ isRegistering ? 'Create a new account' : 'Sign in to your account' }}
        </p>
      </div>
      
      <form class="mt-8 space-y-6" @submit.prevent="handleSubmit">
        <div v-if="error" class="rounded-md bg-red-50 dark:bg-red-900 p-4">
          <div class="text-sm text-red-800 dark:text-red-200">{{ error }}</div>
        </div>
        
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="username" class="sr-only">Username</label>
            <input
              id="username"
              v-model="username"
              name="username"
              type="text"
              autocomplete="username"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Username"
            >
          </div>
          <div>
            <label for="password" class="sr-only">Password</label>
            <input
              id="password"
              v-model="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Password"
              :minlength="isRegistering ? 6 : 1"
            >
          </div>
        </div>

        <div>
          <button
            type="submit"
            :disabled="isLoading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isLoading">Processing...</span>
            <span v-else>{{ isRegistering ? 'Register' : 'Sign in' }}</span>
          </button>
        </div>

        <div class="text-center">
          <button
            type="button"
            @click="toggleMode"
            class="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            {{ isRegistering ? 'Already have an account? Sign in' : 'Need an account? Register' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'Login',
  setup() {
    const authStore = useAuthStore()
    const username = ref('')
    const password = ref('')
    const isRegistering = ref(false)
    
    const error = computed(() => authStore.error)
    const isLoading = computed(() => authStore.isLoading)
    
    const handleSubmit = async () => {
      try {
        if (isRegistering.value) {
          await authStore.register(username.value, password.value)
        } else {
          await authStore.login(username.value, password.value)
        }
      } catch (error) {
        // Error is handled in the store
      }
    }
    
    const toggleMode = () => {
      isRegistering.value = !isRegistering.value
      authStore.error = null
    }
    
    return {
      username,
      password,
      isRegistering,
      error,
      isLoading,
      handleSubmit,
      toggleMode
    }
  }
}
</script>