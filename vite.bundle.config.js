import { defineConfig } from 'vite'
import { resolve } from 'path'

// Full bundle: all packages inlined into one UMD file
// For <script src="agentic.bundle.umd.js"> usage
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/bundle-entry.js'),
      name: 'Agentic',
      formats: ['umd'],
      fileName: () => 'agentic.bundle.umd.js',
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // Don't externalize anything — inline all agentic packages
      external: ['ws', 'better-sqlite3', 'fs', 'path', 'util'],
    },
  },
  resolve: {
    alias: {
      'agentic-core': resolve(__dirname, 'packages/core/src/index.js'),
      'agentic-conductor': resolve(__dirname, 'packages/conductor/src/index.js'),
      'agentic-store': resolve(__dirname, 'packages/store/src/index.js'),
      'agentic-voice': resolve(__dirname, 'packages/voice/src/index.js'),
      'agentic-shell': resolve(__dirname, 'packages/shell/dist/browser.global.js'),
    },
  },
})
