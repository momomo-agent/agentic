# mkdir 原生实现 + -p 支持

## Status: complete

## Changes
- `src/index.ts`: replaced `.keep` workaround with `mkdirOne()` helper + `-p` recursive support

## Implementation
- `mkdirOne()`: uses `fs.mkdir()` if available, falls back to `.keep` write
- `-p`: builds each path prefix and calls `mkdirOne()`, ignoring errors (already exists)
- No `-p`: validates parent exists via `fs.ls()` first
