<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<script>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'App',
  setup() {
    const authStore = useAuthStore()
    
    onMounted(() => {
      authStore.initializeAuth()
    })
  }
}
</script>

<style>
</style>