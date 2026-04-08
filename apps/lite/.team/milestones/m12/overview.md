# m12 — Public API Surface & Architecture Spec

## Goals
Fix remaining architecture gaps: export completeness, type strictness, and create ARCHITECTURE.md.

## Scope
1. Export `ShellResult` from `src/index.ts`
2. Export `shellToolDef`/`executeShell` from `tools/index.ts`
3. Fix `AgenticResult.images` type from `string[] | undefined` to `string[]`
4. Create `ARCHITECTURE.md` documenting module structure and data flow

## Acceptance Criteria
- `ShellResult` importable from `agentic-lite`
- `shellToolDef` importable from `agentic-lite/tools`
- `AgenticResult.images` is `string[]` (never undefined)
- `ARCHITECTURE.md` exists with module diagram and interface specs
