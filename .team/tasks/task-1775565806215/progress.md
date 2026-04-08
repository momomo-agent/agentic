# Progress

## Done
- Removed `.keep` fallback from `mkdirOne()` — now throws `'not supported by this filesystem'`
- Updated non-recursive `mkdir` catch to return `mkdir: not supported by this filesystem` cleanly
- Updated `-p` recursive loop to propagate unsupported error and return early
- Updated `test/dbb.test.ts` DBB-008 test to use `mkdir` mock + `ls` throwing (correct path for missing parent)
- Updated `src/index.test.ts`: replaced `.keep` test with 4 new tests covering mkdir with/without fs.mkdir

## Notes
- 2 pre-existing failures in `test/grep-error-propagation.test.ts` (streaming warning issue, unrelated to this task)
- All other 179 tests pass
