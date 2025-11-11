import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: [
      'node_modules/**',
      'client/**',  // Client tests should be run from client directory
      'dist/**',
      'cypress/**',
      '.{idea,git,cache,output,temp}/**'
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'client/',
        'server/scripts/',
        '**/*.config.js'
      ]
    }
  },
  resolve: {
    alias: {
      '@server': path.resolve(__dirname, './server'),
      '@': path.resolve(__dirname, './server')
    }
  }
})