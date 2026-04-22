import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'Agentic',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => `agentic.${format === 'cjs' ? 'cjs' : format + '.js'}`,
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // Keep other agentic packages external for ESM/CJS
      // They're discovered at runtime via load()
      external: ['agentic-core', 'agentic-conductor', 'agentic-store', 'agentic-voice', 'agentic-shell', 'agentic-memory', 'agentic-embed', 'agentic-sense', 'ws'],
    },
  },
})
