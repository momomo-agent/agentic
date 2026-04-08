# Design — grep error propagation on missing directory

## Files to modify
- `src/index.ts` — `grep()` method (lines 202–247)
- `src/index.test.ts` — new test cases

## Bug location
`src/index.ts:237` — in the no-results path:
```typescript
try { const entries = await this.fs.ls(resolved); lsOk = entries.length > 0 } catch { /* not a dir */ }
if (!lsOk) {
  const r = await this.fs.read(resolved)
  if (r.error) return this.fsError('grep', p, 'No such file or directory')
}
```
When `fs.ls()` throws (directory doesn't exist), `lsOk` stays false and we fall through to `fs.read()`. If `fs.read()` on a non-existent path returns `{ content: undefined }` without an error, we return `''` instead of an error.

## Fix
When `fs.ls()` throws, immediately return the UNIX error — do not fall through to `fs.read()`:

```typescript
for (const p of searchPaths) {
  const resolved = this.resolve(p)
  let lsThrew = false
  try { await this.fs.ls(resolved) } catch { lsThrew = true }
  if (lsThrew) return this.fsError('grep', p, 'No such file or directory')
}
return ''
```

## Edge cases
- `fs.ls()` throws → return error immediately
- `fs.ls()` succeeds but empty dir → return `''` (no match, not error)
- `fs.grep()` itself throws → wrap in try/catch, return `fsError('grep', path, err.message)`

## Test cases
```typescript
it('grep -r on non-existent directory returns error', async () => {
  await expect(shell.exec('grep -r pattern /nonexistent')).resolves.toMatch(/grep: \/nonexistent: No such file or directory/)
})
it('grep -r on empty dir with no matches returns empty string', async () => {
  // fs has /emptydir with no files
  await expect(shell.exec('grep -r pattern /emptydir')).resolves.toBe('')
})
```
