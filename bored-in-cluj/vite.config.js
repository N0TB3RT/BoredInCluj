import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(),
  basicSsl()],
  test: {
    globals: true,
    environment: 'jsdom',
    // Tell Vitest to ignore Playwright E2E tests
    exclude: ['**/tests/**', '**/node_modules/**'],
    setupFiles: './src/setup.js',
    css: false
  }
})