# M2 DBB Check

**Match: 93%** | 2026-04-07T13:24:15.300Z

## Pass (13/15)
- DBB-001: rm -r — `rmRecursive()` walks entries and deletes recursively
- DBB-002: rm -r refuses root — explicit check `if (resolved === '/') return "rm: refusing to remove '/'"`
- DBB-003: rm on dir — checks ls/read to detect directory, returns `rm: <p>: is a directory`
- DBB-004/005: readOnly blocks writes — `checkWritable()` returns Permission denied for touch/mkdir/rm/mv/cp
- DBB-006: readOnly allows reads — `checkWritable` only called on write commands
- DBB-007: cd non-existent — catches ls throw, returns `cd: <path>: No such file or directory`
- DBB-008: cd to file — reads path, if content present returns `cd: <path>: Not a directory`
- DBB-009: cd valid dir — sets `this.cwd = resolved`
- DBB-011: mkdir -p — iterates path segments, creates each with try/catch
- DBB-012: mkdir no parent — checks `parentOf()` via ls, returns error if missing
- DBB-013/014/015: find -type — `findRecursive()` filters by type correctly

## Pass (15/15)
- DBB-010: mkdir native — uses `fs.mkdir` if available; returns error when unavailable; no `.keep` fallback (confirmed by test/mkdir-no-keep-fallback.test.ts)
