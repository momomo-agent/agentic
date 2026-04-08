# M9 Technical Design — Command Completeness Round 4

## Overview
Completes remaining command gaps: `cp -r`, `echo` redirection, `mv` directory support, `ls -a` real dotfiles, and `ARCHITECTURE.md` documentation.

## Architecture Alignment
All changes in `src/index.ts` following the single-file command pattern. No new files except `ARCHITECTURE.md`.

## Component Designs

### 1. cp -r (Recursive Directory Copy)
- Add `-r` flag detection in `cp()` method
- If source is directory and `-r` not set: return `cp: <src>: omitting directory`
- Implement `private async copyRecursive(src: string, dst: string): Promise<void>`
  - `fs.ls(src)` to enumerate entries
  - Files: `fs.read(src/name)` → `fs.write(dst/name, content)`
  - Dirs: recurse into `copyRecursive(src/name, dst/name)`
- Check `fs.readOnly` before any write

### 2. echo Redirection (>, >>)
- In `exec()`, before pipe splitting, detect `>>` and `>` operators via regex
- Pattern: `/^(.+?)\s*(>>|>)\s*(\S+)$/`
- Execute command portion, then:
  - `>`: `fs.write(path, output)`
  - `>>`: read existing content, append `\n` + output, write back
- Check `fs.readOnly` before write

### 3. mv Directory Support
- In `mv()`, attempt `fs.read(src)` — if error, try `fs.ls(src)` to detect directory
- If directory: call `copyRecursive(src, dst)` then `deleteRecursive(src)`
- Reuse existing `deleteRecursive()` from `rm -r`

### 4. ls -a Real Dotfiles
- In `ls()`, without `-a`: filter entries where `name.startsWith('.')` → exclude
- With `-a`: include all entries + prepend synthetic `.` and `..`
- `..` parent = `normalizePath(cwd + '/..')` or `/` at root

## Dependencies
- `cp -r` and `mv` share `copyRecursive()` helper
- `echo` redirection parsed in `exec()` before pipe handling
- `ls -a` is self-contained

## Implementation Order
1. `copyRecursive()` helper
2. `cp -r`
3. `mv` directory support (reuses `copyRecursive`)
4. `ls -a` dotfiles
5. `echo` redirection
6. `ARCHITECTURE.md` (already exists — verify/update)
