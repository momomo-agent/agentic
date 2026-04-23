import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'AgenticMemory',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => `agentic-memory.${format === 'cjs' ? 'cjs' : format + '.js'}`,
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: [],
    },
  },
})
