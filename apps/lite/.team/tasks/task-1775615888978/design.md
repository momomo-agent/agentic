# Task Design: Create agentic-core Package Structure

## Overview

Create the `packages/agentic-core/` directory with build configuration. This is a scaffolding task — no source code extraction yet.

## Files to Create

### 1. `packages/agentic-core/package.json`

```json
{
  "name": "agentic-core",
  "version": "0.1.0",
  "description": "Core agent loop and provider abstraction for agentic AI",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch"
  },
  "keywords": ["agent", "ai", "llm", "provider", "tool-use"],
  "license": "MIT",
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.4.0"
  },
  "dependencies": {}
}
```

### 2. `packages/agentic-core/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

### 3. `packages/agentic-core/tsup.config.ts`

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'es2022',
})
```

### 4. `packages/agentic-core/src/index.ts`

Placeholder — exports nothing yet. Will be populated in task-1775615923116.

```typescript
// agentic-core — placeholder, populated in next task
export {}
```

### 5. Root `package.json` — add workspace (if using workspaces)

Add to root package.json:
```json
"workspaces": ["packages/*", "../*"]
```

**Note**: The root package.json currently uses `link:` for sibling deps (agentic-filesystem, agentic-shell). If the monorepo doesn't use npm workspaces, just ensure `agentic-core` is reachable via `link:../agentic-core` from agentic-lite. Do NOT add workspaces if it would break the existing link: setup.

## Steps

1. `mkdir -p packages/agentic-core/src`
2. Create package.json, tsconfig.json, tsup.config.ts, src/index.ts
3. `cd packages/agentic-core && npm install` to install dev deps
4. `npm run build` — verify build succeeds (even with empty export)

## Acceptance

- `packages/agentic-core/` exists with all 4 files
- `npm run build` in agentic-core exits with code 0
- `dist/index.js` and `dist/index.d.ts` are generated

## Edge Cases

- If `npm install` fails due to missing tsup, check root node_modules (may be hoisted)
- The placeholder `export {}` ensures the build produces valid output
