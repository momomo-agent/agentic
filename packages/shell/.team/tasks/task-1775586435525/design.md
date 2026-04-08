# Technical Design — Fix cp without -r error message format

## Problem
`cp dir/ dest` (without `-r`) returns `cp: dir: is a directory (use -r)` but UNIX standard and tests expect `cp: dir: is a directory` without the hint suffix.

## File to Modify
`src/index.ts` — method `cp()`, line 695

## Change
Remove ` (use -r)` from the error string:

```typescript
// Before (line 695):
try { await this.fs.ls(this.resolve(src)); return `cp: ${src}: is a directory (use -r)` } catch { /* not a directory */ }

// After:
try { await this.fs.ls(this.resolve(src)); return `cp: ${src}: is a directory` } catch { /* not a directory */ }
```

## Test Cases
| Input | Expected |
|-------|----------|
| `cp /mydir /dest` (mydir is dir) | `cp: /mydir: is a directory` |
| Same | string must NOT contain `(use -r)` |

Test file: `test/task-1775574415352.test.ts`

## Edge Cases
- Nested directory path: error message uses the path as given (not resolved)
- The `src` variable is the raw arg, not resolved path — correct for error display

## Dependencies
None — isolated string change.
