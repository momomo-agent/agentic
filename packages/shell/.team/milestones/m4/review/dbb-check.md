# M4 DBB Check

**Match: 100%** | 2026-04-07T10:40:36.908Z

## Pass (13/13)
- DBB-001: grep -i — `new RegExp(pattern, flags.includes('-i') ? 'i' : '')` in both `grep()` and `execWithStdin()`
- DBB-001: -i with -l/-c/-r — flag array passed through; all combinations handled
- DBB-001: case-sensitive without -i — regex created without 'i' flag by default
- DBB-002: find recursive — `findRecursive()` recurses into subdirs, returns full paths
- DBB-002: find -name glob — glob converted to regex via replace of `*` and `?`
- DBB-002: find -type filters recursive — type filter applied at each level of recursion
- DBB-003: rm file — calls `fs.delete(resolved)`
- DBB-003: rm -r — `rmRecursive()` confirmed
- DBB-003: rm nonexistent — `fsError()` returns `rm: <path>: No such file or directory`
- DBB-004: resolve `../` — `normalizePath()` pops stack on `..`
- DBB-004: resolve `../../` — stack pop handles multiple levels
- DBB-004: resolve `a/../b` — inline `..` normalized correctly
- DBB-004: no escape above root — stack.pop only if `stack.length > 0`
