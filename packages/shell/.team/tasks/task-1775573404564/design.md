# Design: Implement wc -l flag

## Problem
`wc -l` at `src/index.ts:632` returns `String(lines)` — missing the filename. UNIX `wc -l` returns `"5 filename"`.

## Fix

**File**: `src/index.ts`, `wc()` method, line 632

```typescript
// Change:
if (flags.includes('-l')) return String(lines)
// To:
if (flags.includes('-l')) return `${lines} ${path}`
```

## Edge Cases
- Empty file: `lines = 0` → `"0 filename"`
- File not found: handled by `r.error` check before this line
- `-l` with other flags: `-l` check is first, takes precedence

## Test Cases
```typescript
it('wc -l returns line count with filename', async () => {
  await fs.write('/f.txt', 'a\nb\nc')
  const r = await shell.exec('wc -l /f.txt')
  expect(r.output).toBe('3 /f.txt')
})

it('wc -l on empty file returns 0', async () => {
  await fs.write('/empty.txt', '')
  const r = await shell.exec('wc -l /empty.txt')
  expect(r.output).toBe('0 /empty.txt')
})
```
