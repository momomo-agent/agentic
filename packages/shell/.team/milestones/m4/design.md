# M4 Technical Design: Command Completeness — Round 2

## Scope
4 targeted fixes/features in `src/index.ts`. No new files needed.

## 1. grep -i (task-1775538626249)
Add `'i'` flag to `RegExp` when `-i` present. Affects `grep()`, `grepStream()`, `execWithStdin()`.

## 2. find recursive (task-1775538654857)
Replace single `fs.ls()` call with a recursive helper that accumulates full paths across subdirs.

## 3. rm fs.delete fix (task-1775538654890)
Non-recursive `rm` silently skips delete when `fs.ls()` throws unexpectedly. Fix: call `fs.delete` directly after confirming not a directory.

## 4. resolve() ../ normalization (task-1775538654925)
After building raw path, split on `/`, process `..` by popping stack, rejoin. Clamp at root.
