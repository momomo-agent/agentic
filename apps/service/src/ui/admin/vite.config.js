import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      'agentic-client': resolve(__dirname, '../../../../../packages/client/src/client.js')
    }
  },
  server: {
    port: 5174,
    proxy: { '/api': 'http://localhost:3000' }
  },
  build: { outDir: '../../../dist/admin' }
})
