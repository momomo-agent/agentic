# Technical Design — Remove src/providers/ Dead Code

## Summary

`src/providers/` is a shim layer that re-exports from `agentic-core`. After the agentic-core extraction, it's dead code. This task switches all imports to `agentic-core` directly and deletes the directory.

## Current State

```
src/providers/
  index.ts      — re-exports from agentic-core (bridge)
  provider.ts   — re-exports from agentic-core (bridge, subset of index.ts)
  anthropic.ts  — legacy standalone implementation (NOT imported by active code)
  openai.ts     — legacy standalone implementation (NOT imported by active code)
```

6 files import from `src/providers/`. `src/ask.ts` already imports from `agentic-core` directly.

## Files to Modify

### 1. `src/index.ts`
- **Change**: Replace `'./providers/index.js'` with `'agentic-core'`
- Current imports:
  ```ts
  import { createProvider } from './providers/index.js'
  import type { Provider } from './providers/index.js'
  ```
- New imports:
  ```ts
  import { createProvider } from 'agentic-core'
  import type { Provider } from 'agentic-core'
  ```
- Also re-export: `export { createProvider } from 'agentic-core'` and `export type { Provider } from 'agentic-core'`

### 2. `src/types.ts`
- **Change**: Replace `'./providers/index.js'` with `'agentic-core'`
- Current: `import type { Provider } from './providers/index.js'`
- New: `import type { Provider } from 'agentic-core'`

### 3. `src/tools/shell.ts`
- **Change**: Replace `'../providers/provider.js'` with `'agentic-core'`
- Current: `import type { ToolDefinition } from '../providers/provider.js'`
- New: `import type { ToolDefinition } from 'agentic-core'`

### 4. `src/tools/code.ts`
- **Change**: Replace `'../providers/provider.js'` with `'agentic-core'`
- Current: `import type { ToolDefinition } from '../providers/provider.js'`
- New: `import type { ToolDefinition } from 'agentic-core'`

### 5. `src/tools/file.ts`
- **Change**: Replace `'../providers/provider.js'` with `'agentic-core'`
- Current: `import type { ToolDefinition } from '../providers/provider.js'`
- New: `import type { ToolDefinition } from 'agentic-core'`

### 6. `src/tools/search.ts`
- **Change**: Replace `'../providers/provider.js'` with `'agentic-core'`
- Current: `import type { ToolDefinition } from '../providers/provider.js'`
- New: `import type { ToolDefinition } from 'agentic-core'`

## Files to Delete

- `src/providers/index.ts`
- `src/providers/provider.ts`
- `src/providers/anthropic.ts`
- `src/providers/openai.ts`
- `src/providers/` (directory)

## Edge Cases

1. **Export surface**: `src/index.ts` re-exports `createProvider` and `Provider` from the providers shim. After removal, these must come from `agentic-core` — same types, same function, just different import path. Verify that `src/index.ts` keeps all public exports identical.

2. **Test imports**: Some tests may import `createProvider` from `'../src/providers/index.js'` or similar. If so, those test imports must also change to `'agentic-core'`. Grep for `from.*providers` in test files before deleting.

3. **Build verification**: After changes, `npm run build` must pass (tsup resolves `agentic-core` via the `link:` dependency in package.json).

## Verification

1. Run `npx vitest run` — all 174 tests must pass
2. Run `npm run build` — must succeed
3. Verify `src/providers/` no longer exists
4. Verify no remaining imports reference `src/providers` or `../providers`
5. Verify `src/index.ts` still exports `ask`, `createProvider`, `Provider`, and all other types

## Execution Order

1. Change all 6 import files (points 1-6 above)
2. Grep for any remaining `providers` references in tests
3. Delete `src/providers/` directory
4. Run `npm run build`
5. Run `npx vitest run`
