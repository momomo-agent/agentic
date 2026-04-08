# M2 Technical Design — Command Completeness & Permissions

## Overview

All changes in `src/index.ts`. No new files. Blocked by M1 test suite (task-1775531299866).

## 1. rm -r recursive delete (task-1775531782004)

`rm()` detects `-r` flag. When present, call `this.fs.ls(resolved)` recursively to collect all descendant paths, delete leaves first, then parents. Safety check: reject if resolved path is `/`.

When `-r` absent and target is a directory (detected via `fs.ls()` returning entries), return error without deleting.

## 2. readOnly permission check (task-1775531800001)

`AgenticFileSystem` may expose a `readOnly` property. Add a private helper:

```ts
private checkWritable(cmd: string, path: string): string | null
```

Returns `"<cmd>: <path>: Permission denied"` if `(this.fs as any).readOnly === true`, else `null`.

Call at the top of: `touch`, `mkdir`, `rm`, `mv`, `cp`, and any future write command.

## 3. cd path validation (task-1775531800002)

Before updating `this.cwd`, call `this.fs.ls(resolved)`. If it throws or returns an error, return `cd: <path>: No such file or directory`. If the path resolves to a file (read succeeds but ls fails), return `cd: <path>: Not a directory`.

## 4. mkdir native + -p (task-1775531800003)

Replace `.keep` workaround. Use `this.fs.mkdir(path)` if available, else keep write fallback only for `-p` multi-level creation. Detect `-p` flag; when present, split path into segments and create each level in sequence, ignoring "already exists" errors. Without `-p`, if parent doesn't exist return `mkdir: <path>: No such file or directory`.

## 5. find -type fix (task-1775531800004)

Replace heuristic `p.endsWith('/')` with `entry.type === 'file'` / `entry.type === 'dir'`. Use the raw `entries` array (not mapped path strings) for type filtering, then map to names after filtering.

## File Changes

- `src/index.ts` — modify `rm`, `cd`, `mkdir`, `find`; add `checkWritable` helper
