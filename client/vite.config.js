import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/BirdBrain/',
  server: {
    proxy: {
      '/birdbrain-api': 'http://localhost:3003',
    },
  },
})
