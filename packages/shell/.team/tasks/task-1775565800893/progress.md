# ls fs.ls() error field handling

## Progress

- Added error field check in `ls()` after `fs.ls()` call (`src/index.ts:167`)
- Added test case for `fs.ls()` returning `{ error: ... }` field
- All 167 tests pass
