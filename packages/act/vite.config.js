import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'AgenticAct',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => `agentic-act.${format === 'cjs' ? 'cjs' : format + '.js'}`,
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['agentic-core'],
    },
  },
})
