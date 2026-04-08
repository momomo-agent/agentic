# 权限/readOnly 检查

## Status: complete

## Changes
- `src/index.ts`: added `checkWritable()` helper; guarded `mkdir`, `rm`, `mv`, `cp`, `touch`

## Implementation
- `checkWritable(cmd, path)`: checks `(this.fs as any).readOnly === true`, returns `Permission denied` error or null
- Guards added at top of each write method before any fs operations
