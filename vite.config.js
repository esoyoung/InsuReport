import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  },
  define: {
    // Force VITE_USE_AI_VALIDATION to true at build time
    // This ensures AI validation is always enabled in production
    'import.meta.env.VITE_USE_AI_VALIDATION': JSON.stringify('true')
  }
})
