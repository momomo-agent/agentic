import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'AgenticSense',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => `agentic-sense.${format === 'cjs' ? 'cjs' : format + '.js'}`,
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: [],
    },
  },
})
