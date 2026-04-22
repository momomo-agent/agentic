import { defineConfig } from 'vite'
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'AgenticVoice',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => `agentic-voice.${format === 'cjs' ? 'cjs' : format + '.js'}`,
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
})
