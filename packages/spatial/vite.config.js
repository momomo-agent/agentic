import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'AgenticSpatial',
      formats: ['es'],
      fileName: () => 'agentic-spatial.es.js',
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['agentic-core'],
    },
  },
})
