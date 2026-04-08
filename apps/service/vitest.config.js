import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '#agentic-embed': path.resolve('./src/runtime/adapters/embed.js'),
    }
  },
  test: {
    coverage: {
      thresholds: { lines: 98, functions: 98, branches: 98, statements: 98 }
    }
  }
})
