# Fix cp without -r error message format

## Progress

### src/index.ts (line 722)
- Removed ` (use -r)` suffix from directory detection error:
  - Before: `cp: ${src}: is a directory (use -r)`
  - After: `cp: ${src}: is a directory`

### Verification
- `test/task-1775574415352.test.ts`: 4/4 tests pass
- Isolated string change, no other files affected

### Notes
- Design line number was 695 but actual was 722 — logic matched exactly
