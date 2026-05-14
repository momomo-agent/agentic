import { defineConfig } from 'vite'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

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
  plugins: [{
    name: 'emit-index-reexport',
    closeBundle() {
      writeFileSync(
        resolve(__dirname, 'dist/index.js'),
        "export * from './agentic-filesystem.es.js'\n"
      )
    },
  }],
})
