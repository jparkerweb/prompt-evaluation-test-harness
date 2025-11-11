import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  // Load env file from parent directory
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '')
  
  return {
    plugins: [vue()],
    css: {
      postcss: path.resolve(__dirname, './postcss.config.js')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      port: parseInt(env.CLIENT_PORT) || 5173,
      proxy: {
        '/api': {
          target: `http://localhost:${env.PORT || 4444}`,
          changeOrigin: true
        }
      }
    },
    build: {
      // Tree shaking is enabled by default in Vite
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': ['vue', 'vue-router', 'pinia', 'axios'],
            'ui': ['@headlessui/vue', '@heroicons/vue']
          }
        }
      }
    }
  }
})