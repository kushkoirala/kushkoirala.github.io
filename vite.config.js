import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Use root base path for development and production
  // If using kushkoirala.github.io, use '/'
  // If using a subdirectory repo like kush-resume, use '/kush-resume/'
  base: mode === 'production' ? '/' : '/',
  server: {
    fs: {
      // Allow serving files from node_modules for WASM
      allow: ['..']
    }
  },
  optimizeDeps: {
    exclude: ['occt-import-js']
  }
}))