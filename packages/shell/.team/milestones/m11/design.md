# M11 Technical Design — Command Completeness Round 5 & ARCHITECTURE.md

## Scope
Four tasks:
1. `cp -r` recursive directory copy (task-1775567275854)
2. `mv` directory support (task-1775567285755)
3. `echo` output redirection `>` / `>>` (task-1775567285818)
4. Write ARCHITECTURE.md (task-1775567285874)

## Key Findings from Source Review

### cp (src/index.ts:447-484)
`cp -r` and `copyRecursive` are already fully implemented. The DBB requires:
- `cp` without `-r` on a directory should return an error (currently it calls `fs.read()` on a dir, which may silently fail or return wrong content).
- Fix: detect directory before file read; return `cp: /srcdir: omitting directory (use -r)`.

### mv (src/index.ts:409-445)
Directory move via `copyRecursive` + `rmRecursive` is already implemented. The DBB scenarios are already covered. No code changes needed — task is to verify and add tests.

### echo redirection (src/index.ts:21-46)
`>` and `>>` redirection is already implemented at the `exec()` level for any command output, not just echo. DBB scenarios are already covered. Task is to verify and add tests.

### ARCHITECTURE.md (task-1775567285874)
ARCHITECTURE.md already exists at repo root with full content. Task is already satisfied — verify and mark done.

## Changes Required

### src/index.ts — cp without -r on directory
In `cp()` method, after resolving src/dst and before `fs.read()`, detect if src is a directory:
```typescript
// After: const r = await this.fs.read(this.resolve(src))
// Add before it:
try {
  await this.fs.ls(this.resolve(src))
  return `cp: ${src}: omitting directory (use -r)`
} catch { /* not a dir, proceed */ }
```

### src/index.test.ts — new test cases
Add tests covering all DBB criteria for cp -r, mv dir, echo redirection.

## File Paths
- `src/index.ts` — cp fix only
- `src/index.test.ts` — new tests
