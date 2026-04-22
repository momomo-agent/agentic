# Agentic Build System Migration — Spec

## Goal
Migrate all agentic packages from hand-written UMD wrappers to Vite library mode.
One build command → ESM + CJS + UMD for every package.

## Scope (Phase 1 — 5 core packages)
Only these packages, in this order:
1. `packages/conductor/` (4 files, 1331 lines)
2. `packages/core/` (1 file, 1776 lines)
3. `packages/store/` (1 file, 478 lines)
4. `packages/voice/` (1 file, 1032 lines)
5. `packages/agentic/` (1 file, 727 lines) — depends on all above

## What to do for each package

### Step 1: Create `src/index.js` (pure ESM)
- Extract the actual logic from the UMD wrapper
- Replace `(function(root, factory) { ... })` with clean `export function` / `export class`
- Keep all existing function signatures and behavior IDENTICAL
- No TypeScript conversion — stay JS for now

### Step 2: Add `vite.config.js`
```js
import { defineConfig } from 'vite'
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'AgenticXxx',  // UMD global name
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => `agentic-xxx.${format}.js`
    },
    rollupOptions: {
      // External deps (other agentic packages) for ESM/CJS
      // Inline them for UMD (browser needs self-contained bundle)
      external: (id, parent, isResolved) => {
        if (process.env.VITE_UMD) return false
        return id.startsWith('agentic-')
      }
    }
  }
})
```

### Step 3: Update `package.json`
```json
{
  "name": "agentic-xxx",
  "version": "0.2.0",
  "type": "module",
  "main": "./dist/agentic-xxx.cjs.js",
  "module": "./dist/agentic-xxx.es.js",
  "browser": "./dist/agentic-xxx.umd.js",
  "exports": {
    ".": {
      "import": "./dist/agentic-xxx.es.js",
      "require": "./dist/agentic-xxx.cjs.js",
      "browser": "./dist/agentic-xxx.umd.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "vite build"
  },
  "devDependencies": {
    "vite": "^6.0.0"
  }
}
```

### Step 4: Keep old file as backup
- Rename `agentic-xxx.js` → `agentic-xxx.legacy.js`
- Don't delete until all consumers migrated

## Special cases

### conductor
- Has 4 source files (intent-state, scheduler, dispatcher, conductor)
- `src/index.js` should import and re-export all:
  ```js
  export { createIntentState } from './intent-state.js'
  export { createScheduler } from './scheduler.js'
  export { createDispatcher } from './dispatcher.js'
  export { createConductor, memoryStore } from './conductor.js'
  ```
- Each sub-file becomes a clean ESM module in `src/`

### agentic (main entry)
- Depends on all other packages
- `src/index.js` uses dynamic import / optional resolution
- UMD build must inline all deps (self-contained for `<script>` tag)
- ESM/CJS build keeps deps external

### shell
- Already uses tsup + TypeScript — migrate to Vite but keep TS
- Has browser.ts (IIFE) and index.ts (ESM) — Vite can handle both

### core
- Has internal `agenticAsk` and `agenticStep` functions
- The UMD wrapper exports `{ agenticAsk, agenticStep, ... }`
- Convert to named exports

### store
- Has SQLite WASM dependency (sql.js)
- Keep as optional/dynamic import

### voice
- Has Web Speech API + ElevenLabs + Deepgram
- Browser-only APIs — mark Node exports appropriately

## Root-level build

Add to root `package.json`:
```json
{
  "scripts": {
    "build": "pnpm -r build",
    "build:bundle": "vite build --config vite.bundle.config.js"
  }
}
```

Add `vite.bundle.config.js` at root — builds a single `agentic.bundle.js` that includes all packages (replaces fluid-agent's `build-bundle.js`):
```js
// Single UMD bundle with all packages inlined
// Output: dist/agentic.umd.js (for <script> tag)
```

## Validation

### Unit tests
- All existing tests must pass with the new build output
- `node -e "const m = require('./dist/agentic-xxx.cjs.js'); ..."` works
- `import { ... } from './dist/agentic-xxx.es.js'` works

### E2E (fluid-agent)
- Replace `lib/agentic.bundle.js` with the Vite-built UMD bundle
- All 6 test cases from earlier must pass:
  1. Pure chat → 0 intents
  2. Single task → intent done
  3. Parallel tasks → 3 workers
  4. Worker completion → talker report
  5. Incremental reporting
  6. Task Manager display

### Size budget
- UMD bundle ≤ 250K (current concatenated: 224K)
- Individual ESM packages should be smaller than current (tree-shaking)

## Do NOT
- Convert JS to TypeScript (separate effort)
- Change any function signatures or behavior
- Touch packages outside Phase 1 scope
- Add any new dependencies beyond vite
- Modify test files (only update import paths if needed)
