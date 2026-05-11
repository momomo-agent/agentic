import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'AgenticFilesystem',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => `agentic-filesystem.${format === 'cjs' ? 'cjs' : format + '.js'}`,
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['better-sqlite3', 'fs', 'fs/promises', 'path', 'node:fs', 'node:path', 'node:fs/promises', 'node:readline'],
    },
  },
})
