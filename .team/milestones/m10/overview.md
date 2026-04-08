# M10: Final DBB Compliance & Coverage Verification

## Goals
Close remaining DBB gaps: error handling correctness, coverage enforcement, and removing the mkdir .keep workaround.

## Scope
1. `grep` error propagation on missing directory — explicit test coverage
2. `ls` fs.ls() error field — handle and surface errors from the fs adapter
3. `mkdir` .keep fallback removal — fail clearly when fs.mkdir unavailable
4. Coverage threshold enforcement — programmatic verification >= 80%

## Acceptance Criteria
- `grep -r /nonexistent` returns a clear error (not empty string)
- `ls /bad` surfaces fs.ls() error field as UNIX-style error
- `mkdir` with no fs.mkdir returns error instead of creating .keep file
- Coverage report generated and threshold verified
- All 167 existing tests continue to pass
