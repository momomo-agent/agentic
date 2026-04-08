import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    pool: 'forks',
    poolOptions: {
      forks: {
        execArgv: ['--max-old-space-size=6144'],
      },
    },
    maxConcurrency: 1,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'src/index.test.ts',
      'test/mkdir-find-cd.test.ts',
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/index.test.ts'],
      thresholds: {
        statements: 80,
        branches: 75,
      },
    },
  },
})
