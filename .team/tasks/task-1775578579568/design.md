# Design: Fix pipe error propagation

## File
`src/index.ts` — `exec()` pipe loop (~line 88)

## Problem
When left segment errors, code does `return { output, exitCode }` early, skipping right commands. Architecture spec says: "if left command fails, right command receives empty stdin".

## Change
In the pipe loop `for (let i = 0; i < segments.length; i++)`, replace early return with empty-stdin passthrough:

```typescript
// line ~95, replace:
if (this.isErrorOutput(output)) {
  exitCode = this.exitCodeFor(output)
  return { output, exitCode }
}

// with:
if (this.isErrorOutput(output)) {
  exitCode = this.exitCodeFor(output)
  output = ''
}
```

## Edge Cases
- Error in segment 0: subsequent segments receive `''` as stdin
- Error in middle segment: exitCode set, remaining segments get `''`
- Final exitCode: first non-zero exitCode is preserved

## Test Cases
- `cat /nonexistent | grep foo` → output `''`, exitCode 1
- `cat /nonexistent | grep foo | wc -l` → output `'0'`, exitCode 0 (wc succeeds on empty)
