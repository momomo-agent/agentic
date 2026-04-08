# Task Design: Architecture mkdir fallback workaround

**Task ID**: task-1775588571270
**Priority**: P1
**Milestone**: m27

## Current State

The mkdir fallback is **already implemented** in `src/index.ts:595-601`:
```typescript
private async mkdirOne(resolved: string): Promise<void> {
  if (typeof (this.fs as any).mkdir === 'function') {
    await (this.fs as any).mkdir(resolved)
  } else {
    await this.fs.write(resolved + '/.keep', '')
  }
}
```

This implements the ARCHITECTURE.md workaround: when `fs.mkdir` is not available, use `write(path + '/.keep', '')` to create directories.

## What This Task Requires

Since the implementation exists, this task should:

1. **Verify the fallback works** — add test cases for mkdir without `fs.mkdir`
2. **Verify `mkdir -p` works with fallback** — recursive creation using fallback
3. **Verify no regression** — mkdir still uses native `fs.mkdir` when available
4. **Verify readOnly interaction** — fallback respects permission checks

## File to Modify

- `src/index.test.ts` — add `describe('mkdir fallback')` block

## Test Cases

### Fallback behavior (2 tests)

```typescript
it('should use .keep fallback when fs.mkdir is unavailable', async () => {
  const fsWithoutMkdir = new MockFileSystem()
  delete (fsWithoutMkdir as any).mkdir  // Remove mkdir method
  const shellNoMkdir = new AgenticShell(fsWithoutMkdir as any)
  const r = await shellNoMkdir.exec('mkdir /newdir')
  expect(r.output).toBe('')
  expect(r.exitCode).toBe(0)
  // Verify .keep file was written
  const read = await fsWithoutMkdir.read('/newdir/.keep')
  expect(read.error).toBeUndefined()
})

it('should use .keep fallback for mkdir -p nested paths', async () => {
  const fsWithoutMkdir = new MockFileSystem()
  delete (fsWithoutMkdir as any).mkdir
  const shellNoMkdir = new AgenticShell(fsWithoutMkdir as any)
  const r = await shellNoMkdir.exec('mkdir -p /a/b/c')
  expect(r.output).toBe('')
  expect(r.exitCode).toBe(0)
})
```

### Regression (1 test)

```typescript
it('should use native fs.mkdir when available', async () => {
  const fsWithMkdir = new MockFileSystem()
  const mkdirSpy = vi.spyOn(fsWithMkdir, 'mkdir')
  const shellWithMkdir = new AgenticShell(fsWithMkdir as any)
  await shellWithMkdir.exec('mkdir /spydir')
  expect(mkdirSpy).toHaveBeenCalledWith('/spydir')
})
```

### Permission check (1 test)

```typescript
it('should return permission error for readOnly fs with fallback', async () => {
  const fsReadOnly = new MockFileSystem()
  delete (fsReadOnly as any).mkdir
  ;(fsReadOnly as any).readOnly = true
  const shellRO = new AgenticShell(fsReadOnly as any)
  const r = await shellRO.exec('mkdir /newdir')
  expect(r.output).toContain('Permission denied')
  expect(r.exitCode).toBe(1)
})
```

## Dependencies

- None

## Verification

Run `npm test` — all new tests pass, no regressions.
