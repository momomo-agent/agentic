# Design: Fix mkdir error message format

## File to Modify
- `src/index.ts` — `mkdir()` method (lines 452–480)

## Problem
When parent directory is missing and `-p` not used, current output is:
```
mkdir: cannot create directory 'X': No such file or directory
```
UNIX standard requires:
```
mkdir: X: No such file or directory
```

## Change
In `mkdir()`, line 470, replace:
```typescript
return `mkdir: cannot create directory '${p}': No such file or directory`
```
With:
```typescript
return `mkdir: ${p}: No such file or directory`
```

## Function Signature (unchanged)
```typescript
private async mkdir(args: string[]): Promise<string>
```

## Edge Cases
- `mkdir /a/b/c` where `/a/b` doesn't exist → `mkdir: /a/b/c: No such file or directory`
- `mkdir -p /a/b/c` → still succeeds (recursive path unchanged)
- `mkdir /existing` → existing error path unchanged

## Test Cases
```typescript
it('mkdir without -p returns UNIX error format', async () => {
  const r = await sh.exec('mkdir /missing/path')
  expect(r.output).toBe('mkdir: /missing/path: No such file or directory')
  expect(r.exitCode).toBe(1)
})
```

## Dependencies
None — isolated string change in one return statement.
