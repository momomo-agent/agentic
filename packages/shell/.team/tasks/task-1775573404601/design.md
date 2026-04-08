# Design: Fix touch on existing empty file

## Problem
`touch()` at `src/index.ts:597` uses `r.content == null` as the guard. This is correct for `undefined` but the task notes the real risk is `!r.content` being truthy for `''`. The safest fix is to guard on `r.error` instead.

## File to Modify
- `src/index.ts` — `touch()` method (~line 597)

## Fix
```typescript
// Change:
if (r.content == null) await this.fs.write(this.resolve(path), '')
// To:
if (r.error) await this.fs.write(this.resolve(path), '')
```

`r.error` is set only when the file does not exist. Existing files (even empty) have `r.error` falsy.

## Edge Cases
- Non-existent file → `r.error` truthy → creates with `''`
- Existing file with content → no write
- Existing empty file (`content === ''`) → no write

## Test Cases
```typescript
it('touch on existing empty file does not overwrite', async () => {
  await fs.write('/e.txt', '')
  await shell.exec('touch /e.txt')
  expect((await fs.read('/e.txt')).content).toBe('')
})
it('touch creates non-existent file', async () => {
  await shell.exec('touch /new.txt')
  expect((await fs.read('/new.txt')).content).toBe('')
})
it('touch on file with content preserves content', async () => {
  await fs.write('/f.txt', 'hello')
  await shell.exec('touch /f.txt')
  expect((await fs.read('/f.txt')).content).toBe('hello')
})
```

## Dependencies
None — one-line change in `touch()`.
