import { defineConfig } from 'astro/config'
import icon from 'astro-icon'

export default defineConfig({
  site: 'https://usage-app.github.io',
  output: 'static',
  integrations: [icon()]
})
