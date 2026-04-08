# Task Design: Verify All Tests Pass After Extraction

## Overview

Run the full test suite after the agentic-core extraction to verify no regressions. This is a verification/gate task — if tests fail, fix them.

## Steps

1. Ensure all prior tasks are complete (package structure, extraction, ask.ts refactoring)
2. Run `npm install` in root to pick up the new agentic-core link dependency
3. Run `cd packages/agentic-core && npm run build` to ensure agentic-core builds
4. Run `npm test` in root to execute the full vitest suite
5. Verify output: all 107 tests pass, exit code 0
6. If any tests fail:
   - Read the failure output
   - Identify root cause (likely import path issues or type mismatches)
   - Fix the failing file(s)
   - Re-run tests until 107/107 pass

## Common Failure Scenarios

### Import Path Errors
- `src/ask.ts` imports from old paths (`./providers/index.js`) instead of `agentic-core`
- Fix: Update imports to `import { runAgentLoop, createProvider } from 'agentic-core'`

### Type Mismatches
- agentic-core's `ProviderConfig` vs agentic-lite's `AgenticConfig` — ensure `createProvider()` is called with compatible config
- Tool-specific types (Source, CodeResult, etc.) still in agentic-lite — ensure no cross-package type errors

### Build Order Issues
- agentic-core must be built before agentic-lite tests can run
- Fix: `cd packages/agentic-core && npm run build` before `npm test`

### Missing Re-exports
- `src/index.ts` re-exports `createProvider` and `Provider` from providers — these now come from agentic-core
- Fix: Update re-exports in src/index.ts

## Acceptance

- `npm test` exits with code 0
- Output shows 107/107 tests passing
- No test files were modified (extraction should be transparent to tests)

## Dependencies

- Depends on task-1775613090477 (refactoring must be complete)
