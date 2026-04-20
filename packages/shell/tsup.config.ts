import { defineConfig } from 'tsup'
export default defineConfig([
  { entry: ['src/index.ts'], format: ['esm'], dts: true, target: 'es2022' },
  { entry: ['src/browser.ts'], format: ['iife'], globalName: 'AgenticShellBrowser', outDir: 'dist', target: 'es2022', platform: 'browser' },
])
