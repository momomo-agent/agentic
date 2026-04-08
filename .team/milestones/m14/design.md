# M14 Technical Design

## Milestone: Public API Completeness & Type Correctness

### Tasks

1. **Fix `AgenticResult.images` type** — change `images: string[]` from optional to required in `src/types.ts` (already required, confirm no `| undefined`)
2. **Export `ShellResult`** — add to `src/index.ts` export list
3. **Confirm shell tool exports** — `shellToolDef`/`executeShell` already exported from `src/tools/index.ts` (verify, no change needed)
4. **Document custom provider fallback** — add JSDoc to `AgenticConfig.baseUrl` in `src/types.ts`

### Approach

All changes are confined to `src/types.ts` and `src/index.ts`. No logic changes — type and export surface only.
