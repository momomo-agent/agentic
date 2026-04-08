# Technical Design — task-1775587050240: Add cd-to-file boundary test

## Goal
Add test coverage for `cd` to a file path returning "Not a directory" error. Existing tests in `test/cd-validation.test.ts` and `test/mkdir-find-cd.test.ts` cover basic case — add boundary tests.

## Files to Modify
- `test/cd-validation.test.ts` — add new test cases

## Existing Coverage
- `cd /file.txt` returns `cd: /file.txt: Not a directory`, cwd unchanged (cd-validation.test.ts:40-50)

## Additional Test Cases to Add

### 1. cd to file with relative path from nested cwd
```typescript
it('cd to file with relative path returns Not a directory', async () => {
  const fs = makeMockFs({
    ls: vi.fn().mockImplementation(async (path: string) => {
      if (path === '/a') return [{ name: 'b', type: 'dir' }, { name: 'file.txt', type: 'file' }]
      if (path === '/a/b') return [{ name: 'inner.txt', type: 'file' }]
      return []
    }),
    read: vi.fn().mockImplementation(async (path: string) => {
      if (path === '/a/file.txt' || path === '/a/b/inner.txt') return { content: 'data', error: null }
      return { content: undefined, error: 'not found' }
    }),
  })
  const sh = new AgenticShell(fs)
  await sh.exec('cd /a')
  const out = (await sh.exec('cd file.txt')).output
  expect(out).toContain('Not a directory')
  expect((await sh.exec('pwd')).output).toBe('/a')
})
```

### 2. cd to file via .. traversal
```typescript
it('cd ../file.txt from subdir returns Not a directory', async () => {
  // Setup: cwd is /a/b, /a/file.txt is a file
  // Execute: cd ../file.txt
  // Assert: Not a directory error, cwd remains /a/b
})
```

### 3. cd to file after multiple navigations
```typescript
it('cd to file after cd to valid dir then to file', async () => {
  // Setup: /a is dir, /a/target is file
  // Execute: cd /a; cd target
  // Assert: Not a directory, cwd remains /a
})
```

## Implementation Notes
- `cd()` at `src/index.ts:560-568`
- File detection: line 564-565 reads the resolved path; if `read()` succeeds (no error, content defined), it's a file → "Not a directory"
- If `ls()` throws, it's non-existent → "No such file or directory"
- If `ls()` succeeds but `read()` returns error, it's a directory → cd succeeds
- No source code changes needed

## Verification
- Run `npx vitest run test/cd-validation.test.ts` — all tests pass
- DBB criteria: DBB-m24-cd-file-001 through DBB-m24-cd-file-003 verified
