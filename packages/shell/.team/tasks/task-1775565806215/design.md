# Design — mkdir .keep fallback removal

## Files to modify
- `src/index.ts` — `mkdirOne()` (lines 330–336)
- `src/index.test.ts` — update/add tests

## Current code (lines 330–336)
```typescript
private async mkdirOne(resolved: string): Promise<void> {
  if (typeof (this.fs as any).mkdir === 'function') {
    await (this.fs as any).mkdir(resolved)
  } else {
    await this.fs.write(resolved + '/.keep', '')  // ← remove this
  }
}
```

## Fix
Remove the `.keep` fallback. Throw when `fs.mkdir` is unavailable so `mkdir()` can catch and return the error:

```typescript
private async mkdirOne(resolved: string): Promise<void> {
  if (typeof (this.fs as any).mkdir === 'function') {
    await (this.fs as any).mkdir(resolved)
  } else {
    throw new Error('not supported by this filesystem')
  }
}
```

The existing `mkdir()` method already wraps `mkdirOne()` in try/catch and returns `mkdir: cannot create directory '${p}': ${e.message}`. Update that message to match DBB-M10-003 exactly:

In `mkdir()`, change the catch block to:
```typescript
} catch (e: any) {
  const msg = e.message === 'not supported by this filesystem'
    ? 'not supported by this filesystem'
    : e.message ?? String(e)
  return `mkdir: ${msg}`
}
```

For `-p` (recursive), the loop silently catches errors — change to propagate the unsupported error:
```typescript
try { await this.mkdirOne(prefix) } catch (e: any) {
  if (e.message === 'not supported by this filesystem') return `mkdir: not supported by this filesystem`
}
```

## Edge cases
- `fs.mkdir` absent + `mkdir /newdir` → `mkdir: not supported by this filesystem`
- `fs.mkdir` absent + `mkdir -p /a/b/c` → `mkdir: not supported by this filesystem`
- `fs.mkdir` present → works as before, no `.keep` file
- No `.keep` file created in any path

## Test cases
```typescript
it('mkdir returns error when fs.mkdir unavailable', async () => {
  // MockFileSystem without mkdir method
  await expect(shell.exec('mkdir /newdir')).resolves.toBe('mkdir: not supported by this filesystem')
})
it('mkdir -p returns error when fs.mkdir unavailable', async () => {
  await expect(shell.exec('mkdir -p /a/b/c')).resolves.toBe('mkdir: not supported by this filesystem')
})
it('no .keep file created when fs.mkdir unavailable', async () => {
  await shell.exec('mkdir /newdir')
  const r = await fs.read('/newdir/.keep')
  expect(r.error).toBeTruthy()
})
```
