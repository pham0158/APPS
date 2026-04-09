import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/pickleball-v3/',
  plugins: [react()],
})
