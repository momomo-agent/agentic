# Design: Fix unknown command exit code

## File to modify
- `src/index.ts`

## Change
In `exitCodeFor()` (line ~115), change `command not found` to return `2` instead of `127`:

```typescript
// Before
if (/\bcommand not found\b/.test(first)) return 127

// After
if (/\bcommand not found\b/.test(first)) return 2
```

## Edge cases
- `exec('ls')` → exitCode 0 (unchanged)
- `exec('cat nonexistent')` → exitCode 1 (unchanged)
- `exec('foobar')` → output contains "command not found" → exitCode 2

## Test cases
```typescript
it('unknown command returns exitCode 2', async () => {
  expect((await shell.exec('foobar')).exitCode).toBe(2)
})
it('known command still returns 0', async () => {
  expect((await shell.exec('ls /')).exitCode).toBe(0)
})
```
