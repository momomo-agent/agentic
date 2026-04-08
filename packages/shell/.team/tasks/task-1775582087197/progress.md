# Add bracket glob expressions [abc] support

## Progress

- Rewrote `matchGlob()` to handle `[...]` bracket expressions; unclosed `[` escapes as literal
- Updated `expandGlob()`, `expandPathArgs()`, and `ls()` glob checks to include `[` in detection regex
- 3 tests in `test/bracket-glob-m21.test.ts` — all passing
