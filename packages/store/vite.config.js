import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'AgenticStore',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => `agentic-store.${format === 'cjs' ? 'cjs' : format + '.js'}`,
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['better-sqlite3', 'sql.js', 'fs', 'path', 'util'],
    },
  },
})
