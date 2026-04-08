import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: true,
  external: ['fs/promises', 'node:fs', 'node:path', 'node:fs/promises', 'better-sqlite3'],
})
