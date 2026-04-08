# m17 — Technical Design: Glob Expansion, cp Error & Input Redirection

## Overview
Three targeted fixes/features in `src/index.ts`:
1. Glob expansion for `cat`, `rm`, `cp` (ls already has it)
2. Fix `cp` error message for directory without `-r`
3. Verify/test input redirection `<` (already implemented in `exec()`)

## Architecture

### Glob Expansion (task-1775574408103)
`expandGlob(pattern, dir)` already exists at line 222. It is used by `ls` and `grep`.
Extend `cat`, `rm`, `cp` to call `expandGlob` when path args contain `*` or `?`.

Pattern: before processing path args, expand any glob patterns:
```typescript
private async expandArgs(args: string[]): Promise<string[]>
// For each non-flag arg: if contains [*?], call expandGlob(arg, cwd), else keep as-is
// Returns flat expanded list; empty expansion → keep original (caller handles no-match)
```

### cp Directory Error (task-1775574415352)
Current code at line 560:
```typescript
return `cp: ${src}: is a directory (use -r)`
```
Fix: change to `cp: ${src}: is a directory` (drop ` (use -r)` suffix to match UNIX standard).

### Input Redirection (task-1775574415438)
Already implemented in `exec()` at lines 26–58. Task requires adding tests to verify it works.

## Files
- `src/index.ts` — all changes
- `src/index.test.ts` — new tests

## Dependencies
- `expandGlob()` (line 222) — reused, no changes needed
- `fs.ls()` — used by expandGlob
