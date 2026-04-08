# Fix touch on existing empty file

## Progress

## Done
- `src/index.ts` touch(): `if (r.content == null)` → `if (r.error)`
- Existing `test/touch-empty-file.test.ts` covers all 3 cases (pass)
