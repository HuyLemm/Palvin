import { defineConfig } from 'vitest/config'

// Kept separate from vite.config.ts (which loads the Figma Make plugins) so
// tests run fast and without the dev-server-only plugins.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
