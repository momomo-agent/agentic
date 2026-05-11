import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'AgenticShell',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => `agentic-shell.${format === 'cjs' ? 'cjs' : format + '.js'}`,
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['agentic-filesystem'],
    },
  },
})
