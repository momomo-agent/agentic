# Fix public API exports — ShellResult and shell tools

## Progress

### Completed
- Added `ShellResult` to type exports in src/index.ts
- Added `shellToolDef` and `executeShell` exports in src/tools/index.ts

### Changes made
1. src/index.ts: Added `ShellResult` to the type export line
2. src/tools/index.ts: Added shell tool exports

### Verification
- Confirmed `ShellResult` is defined in types.ts (line 69)
- Confirmed `shellToolDef` and `executeShell` are exported from shell.ts (lines 7, 19)
- TypeScript compilation shows pre-existing errors unrelated to these changes

### Status
Task complete. The public API now properly exports shell-related types and functions.
