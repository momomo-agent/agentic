# m14 — Public API Completeness & Type Correctness

## Goals
Fix remaining partial architecture gaps: type correctness, missing exports, and undocumented behavior.

## Scope
1. Fix `AgenticResult.images` type from `string[] | undefined` to `string[]`
2. Export `ShellResult` from `src/index.ts`
3. Export `shellToolDef`/`executeShell` from `tools/index.ts`
4. Document custom provider silent fallback behavior

## Acceptance Criteria
- `AgenticResult.images` is `string[]` (never undefined) in types.ts
- `ShellResult` is exported from public API surface
- `shellToolDef` and `executeShell` exported from tools/index.ts
- Custom provider fallback behavior documented in README or inline JSDoc
