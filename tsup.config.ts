import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'es2022',
  external: ['quickjs-emscripten', 'agentic-shell', 'pyodide'],
  noExternal: ['agentic-filesystem', 'agentic-core'],
})
