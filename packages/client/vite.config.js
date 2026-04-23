import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'AgenticClient',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => `agentic-client.${format === 'cjs' ? 'cjs' : format + '.js'}`,
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['ws'],
    },
  },
})
