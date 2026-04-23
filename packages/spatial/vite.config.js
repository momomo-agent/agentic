import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'AgenticSpatial',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => `agentic-spatial.${format}.js`,
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['agentic-core'],
      output: {
        globals: { 'agentic-core': 'AgenticCore' },
      },
    },
  },
})
