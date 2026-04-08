# Fix mkdir .keep fallback

## Progress

- Changed `mkdirOne()` to write `path/.keep` instead of throwing when `fs.mkdir` unavailable
- Removed dead code checking for `'not supported by this filesystem'` error
- Updated test file to verify .keep is written; all 4 tests pass
