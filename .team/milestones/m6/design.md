# M6 Technical Design — Command Completeness Round 3

## Overview
Four targeted enhancements to `src/index.ts`: mv directory support, cp -r recursive copy, ls -a real dotfiles, echo redirection.

## Approach

### mv directory support
Detect if src is a directory via `fs.ls()`. If so, recursively copy all entries to dst path then delete src tree. Reuse a shared `copyDir(src, dst)` helper also used by cp -r.

### cp -r recursive directory copy
Add `-r` flag check. If src is a directory and -r is set, call `copyDir(src, dst)`. If src is a directory and -r is absent, return `cp: src: omitting directory`.

### ls -a real dotfiles
Current code prepends synthetic `.` and `..` but the fs.ls() results already include real dotfiles — they are just filtered out by the `else` branch. Fix: when `-a`, skip the filter (keep all entries from fs) and prepend `.` and `..`.

### echo redirection
Parse `>` and `>>` operators in `exec()` before pipe splitting, or handle in `execSingle()` by detecting them in the raw command string. Cleanest: handle in `exec()` before pipe check — detect `>>`/`>` in the trimmed command, extract lhs/rhs, execute lhs, write/append result to file.

## Shared Helper
```typescript
private async copyDir(src: string, dst: string): Promise<string | null>
// Returns null on success, error string on failure
```

## Files Modified
- `src/index.ts` — all changes
- `src/index.test.ts` — new tests per DBB criteria
