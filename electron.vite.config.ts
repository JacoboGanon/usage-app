import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: ['electron']
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        external: ['electron']
      }
    }
  },
  renderer: {
    plugins: [react()],
    server: {
      hmr: true
    },
    build: {
      rollupOptions: {
        input: './src/renderer/index.html'
      }
    }
  }
})
