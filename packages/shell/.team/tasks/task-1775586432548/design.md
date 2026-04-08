# Technical Design — Fix wc output format (tabs + filename)

## Problem
`wc -l`, `wc -w`, `wc -c` return only the count (e.g. `3`) but tests expect `count\tfilename` (e.g. `3\t/f.txt`).

## File to Modify
`src/index.ts` — method `wc()`, lines 767-769

## Change
Append `\t${path}` to each flag branch:

```typescript
// Before (lines 767-769):
if (flags.includes('-l')) return `${lines}`
if (flags.includes('-w')) return `${words}`
if (flags.includes('-c')) return `${chars}`

// After:
if (flags.includes('-l')) return `${lines}\t${path}`
if (flags.includes('-w')) return `${words}\t${path}`
if (flags.includes('-c')) return `${chars}\t${path}`
```

Line 770 (no-flags default) already returns `\t`-separated output with filename — no change needed.

## Test Cases
| Input | Expected |
|-------|----------|
| `wc -l /f.txt` (3 lines) | `3\t/f.txt` |
| `wc -l /empty.txt` | `0\t/empty.txt` |
| `wc -w /f.txt` ("hello world") | `2\t/f.txt` |
| `wc -c /f.txt` ("abc") | `3\t/f.txt` |

Test file: `test/wc-flags-m16.test.ts`

## Edge Cases
- Empty file: count is 0, filename still appended
- Path includes directories: filename part is the full path argument as given

## Additional Test Updates Needed
The existing tests in `src/index.test.ts` (lines 671-687) currently expect just the count value. After this fix, they must be updated:

| Line | Current expectation | New expectation |
|------|-------------------|-----------------|
| 674 | `expect(r.output).toBe('3')` | `expect(r.output).toBe('3\t/f.txt')` |
| 680 | `expect(r.output).toBe('3')` | `expect(r.output).toBe('3\t/f.txt')` |
| 686 | `expect(r.output).toBe('3')` | `expect(r.output).toBe('3\t/f.txt')` |

## Dependencies
None — isolated change to one method.
