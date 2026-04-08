# Technical Design — task-1775587050164: Add rm -r root safety test

## Goal
Add test coverage for `rm -r /` root deletion refusal. Existing test in `test/rm-recursive.test.ts` at lines 42-49 covers basic case — add additional boundary tests.

## Files to Modify
- `test/rm-recursive.test.ts` — add new test cases

## Existing Coverage
- `rm -r /` returns `rm: refusing to remove '/'` and `fs.delete` not called (line 42-49)

## Additional Test Cases to Add

### 1. rm / (without -r) also refuses root
```typescript
it('rm / (without -r) also refuses to remove root', async () => {
  const mockFs = makeMockFs()
  const sh = new AgenticShell(mockFs)
  const out = (await sh.exec('rm /')).output
  expect(out).toBe("rm: refusing to remove '/'")
  expect(mockFs.delete).not.toHaveBeenCalled()
})
```

### 2. rm -rf / refuses root
```typescript
it('rm -rf / refuses to remove root', async () => {
  const mockFs = makeMockFs()
  const sh = new AgenticShell(mockFs)
  const out = (await sh.exec('rm -rf /')).output
  expect(out).toBe("rm: refusing to remove '/'")
  expect(mockFs.delete).not.toHaveBeenCalled()
})
```

### 3. rm -r on non-root path still works (no regression)
```typescript
it('rm -r /tmp still works after root safety check', async () => {
  const mockFs = makeMockFs({
    ls: vi.fn().mockResolvedValue([{ name: 'f.txt', type: 'file' }]),
  })
  const sh = new AgenticShell(mockFs)
  const out = (await sh.exec('rm -r /tmp')).output
  expect(out).toBe('')
  expect(mockFs.delete).toHaveBeenCalledWith('/tmp/f.txt')
  expect(mockFs.delete).toHaveBeenCalledWith('/tmp')
})
```

## Implementation Notes
- Root check at `src/index.ts:640`: `if (resolved === '/') return "rm: refusing to remove '/'"`
- Check happens AFTER path resolution (line 639), so `cd /subdir; rm -r ../..` correctly resolves to `/` and is blocked
- The check is inside the per-path loop, so `rm -r /other /` blocks on second path
- No source code changes needed

## Verification
- Run `npx vitest run test/rm-recursive.test.ts` — all tests pass
- DBB criteria: DBB-m24-rm-root-001, DBB-m24-rm-root-002 verified
