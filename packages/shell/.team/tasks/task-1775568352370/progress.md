# Input redirection (<) support

## Status: Complete

- Added `<` input redirection parsing in `exec()` before `>>` / `>` handling
- Reads redirect file via `fs.read()`, returns exitCode 1 if missing
- Passes file content as stdin to `execWithStdin()`
- Supports combined `< file > outfile` and `< file >> outfile`
- Added DBB-m12-006 to 009 tests; all 205 tests pass

