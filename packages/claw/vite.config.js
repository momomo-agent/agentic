import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'AgenticClaw',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => `agentic-claw.${format === 'cjs' ? 'cjs' : format + '.js'}`,
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['agentic-core', 'agentic-memory'],
    },
  },
})
