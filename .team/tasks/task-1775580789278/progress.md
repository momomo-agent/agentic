# Fix grep -i with -l/-c in multi-file mode

## Progress

## Fix Applied
- `src/index.ts:353`: Changed `this.fs.grep(caseInsensitive ? '' : pattern)` → `this.fs.grep(pattern)`
- Post-filter at line 358 already applies `new RegExp(pattern, 'i')` correctly — no other changes needed

## Tests Added
- `test/grep-i-multifile-m20.test.ts`: 4 tests — all pass
  - fs.grep receives pattern (not empty string) when -i is set
  - grep -i -l returns correct filenames
  - grep -i -c returns correct count
  - grep -i -r recursive case-insensitive search
