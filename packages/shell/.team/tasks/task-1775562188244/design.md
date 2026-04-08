# Design — grep streaming fallback indication

## File to Modify
- `src/index.ts`

## Change
In `grepStream` (line ~229), the fallback branch currently returns matches silently.
Prepend a warning line when falling back:

```typescript
// After: const WARNING = ...
const WARNING = 'grep: warning: streaming unavailable, using read() fallback'

// In fallback branch, before returning:
return [WARNING, ...matches]
```

The streaming branch returns matches unchanged (no warning).

## Function Signature (unchanged)
```typescript
private async grepStream(pattern: string, path: string, flags: string[]): Promise<string[]>
```

## Edge Cases
- Empty file with no matches: return `[WARNING]` (warning only, no match lines)
- Caller joins result with `\n` — warning appears as first line of output

## Test Cases
```typescript
it('warns when readStream unavailable', async () => {
  // fs has no readStream
  const out = await shell.exec('grep foo /file.txt')
  expect(out).toMatch(/^grep: warning: streaming unavailable/)
})
it('no warning when readStream available', async () => {
  // fs has readStream
  const out = await shell.exec('grep foo /file.txt')
  expect(out).not.toMatch(/warning/)
})
```
