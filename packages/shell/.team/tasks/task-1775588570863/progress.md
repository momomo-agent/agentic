# Progress: Implement glob bracket expressions [abc]

## What was done

### Source change (`src/index.ts`)
- Fixed bracket negation in `matchGlob()` method (~line 371-373)
- `[!abc]` now correctly converts to `[^abc]` regex (UNIX glob negation -> regex negation)
- `[!]` (3 chars, only negation marker with no content) passes through as literal
- Used `bracket.length > 3` condition (the design said `> 2` but that incorrectly converts `[!]` to `[^]`)

### Tests added (`test/bracket-glob-m21.test.ts`)
- Added `negated bracket glob [!abc]` describe block with 3 tests:
  1. `[!abc]*` excludes a/b/c prefixed files
  2. `[!a-z]*` excludes lowercase-prefixed files
  3. `[!]` treated as literal (not negation)

### Verification
- All 6 bracket tests pass
- All 27 glob-related tests pass (no regressions)
- 5 pre-existing failures in grep-i-consistency-fix.test.ts (unrelated)

## Design note
The design stated `bracket.length > 2` for the negation check, but `[!]` has length 3 and should be treated as literal. Changed to `> 3` to handle this edge case correctly.
