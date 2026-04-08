# Test Result: Fix mkdir error message format

## Status: DONE

## Tests Run
- test/dbb.test.ts (DBB-008): PASS — mkdir without -p on missing parent returns correct error
- test/mkdir-find-cd.test.ts (DBB-012): PASS

## Findings
Source at line 468 already uses correct UNIX format: `mkdir: ${p}: No such file or directory`.
All tests pass.
