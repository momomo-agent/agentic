# Glob pattern expansion in command args

## Progress

- Added `expandPathArgs()` helper in `src/index.ts` after `expandGlob`
- Updated `cat`, `rm` to call `expandPathArgs` before filtering paths
- Updated `cp` to handle glob src: expands matches and copies each to dst dir
- Added 4 tests in `src/index.test.ts` — all pass ✓
- Fixed glob no-match guard in `cat`: returns error when path still contains `*`/`?` after expansion
- All 6 tests in `test/glob-expansion-m17.test.ts` pass ✓
