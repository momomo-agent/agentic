import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        execArgv: ['--max-old-space-size=8192'],
      },
    },
    maxConcurrency: 1,
    sequence: { concurrent: false },
    include: ['test/mkdir-find-cd.test.ts'],
  },
})
