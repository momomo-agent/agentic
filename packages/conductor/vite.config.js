import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'AgenticConductor',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => `agentic-conductor.${format === 'cjs' ? 'cjs' : format + '.js'}`,
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
})
