import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    pool: 'forks',
    coverage: {
      thresholds: { lines: 98, functions: 98, branches: 98, statements: 98 }
    }
  }
})
