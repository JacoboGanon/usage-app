import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://usage-app.github.io',
  output: 'static',
  vite: {
    css: {
      postcss: {
        plugins: []
      }
    }
  }
})
