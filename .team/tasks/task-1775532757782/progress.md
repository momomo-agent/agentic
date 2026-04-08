# ls 分页支持

## Progress

## Implementation Complete

Added pagination support to ls command in `src/index.ts`:

### Changes Made
1. Added `--page` flag parsing (defaults to null for no pagination)
2. Added `--page-size` flag parsing (defaults to 20)
3. Implemented page validation (page 0 or negative → page 1)
4. Implemented slice logic after hidden file filtering
5. Updated path argument parsing to exclude flag values

### Implementation Details
- Pagination applied after `-a` filtering but before formatting
- Page numbers are 1-indexed (UNIX convention)
- Invalid page size defaults to 20
- Pages beyond last page return empty string
- Backward compatible: no `--page` flag returns all entries

### Test Coverage
Created `test/ls-pagination.test.ts` with 9 test cases:
- ✓ First page returns correct entries
- ✓ Middle page returns correct entries
- ✓ Last partial page returns remaining entries
- ✓ Beyond last page returns empty string
- ✓ No pagination returns all entries (backward compat)
- ✓ Page 0 treated as page 1
- ✓ Negative page treated as page 1
- ✓ Default page size is 20
- ✓ Works with -l flag

All 9 pagination tests passing.

## Files Modified
- `src/index.ts` - ls() method (lines 96-127)

## Files Created
- `test/ls-pagination.test.ts` - 9 test cases
