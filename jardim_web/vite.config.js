import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Tailwind v3 via PostCSS — compatível com Node 18
export default defineConfig({
  plugins: [react()],
})
