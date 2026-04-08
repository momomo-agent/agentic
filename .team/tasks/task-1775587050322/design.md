# Technical Design — task-1775587050322: Add path resolution unit tests

## Goal
Add dedicated unit tests for `normalizePath()` and `resolve()` boundary behavior. Existing tests in `test/resolve-path-normalization.test.ts` and `test/path-resolution-dbb.test.ts` cover basic cases — add edge cases.

## Files to Modify
- `test/resolve-path-normalization.test.ts` — add new test cases

## Existing Coverage
Tests cover: ../ from subdirectory, ../../ from nested dir, root escape prevention, mixed a/../b, absolute path with ../, cd with ../, cd with ../../.

## Additional Test Cases to Add

### 1. Trailing slash handling
```typescript
it('resolve handles trailing slash correctly', async () => {
  const fs = makeMockFs()
  const sh = new AgenticShell(fs)
  await sh.exec('cd /a/b/')
  expect((await sh.exec('pwd')).output).toBe('/a/b')
})
```

### 2. Multiple consecutive slashes
```typescript
it('resolve normalizes multiple consecutive slashes', async () => {
  const fs = makeMockFs({ mkdir: vi.fn().mockResolvedValue(undefined) })
  const sh = new AgenticShell(fs)
  await sh.exec('touch /a//b//file.txt')
  // normalizePath should collapse // to /
  // fs.write should be called with /a/b/file.txt
})
```

### 3. ./. segment handling
```typescript
it('resolve handles ./ prefix from cwd', async () => {
  const fs = makeMockFs()
  const sh = new AgenticShell(fs)
  await sh.exec('cd /a/b')
  await sh.exec('touch ./file.txt')
  // fs.write should be called with /a/b/file.txt
})
```

### 4. Root with trailing slash cd
```typescript
it('cd / stays at /', async () => {
  const fs = makeMockFs()
  const sh = new AgenticShell(fs)
  await sh.exec('cd /a/b')
  await sh.exec('cd /')
  expect((await sh.exec('pwd')).output).toBe('/')
})
```

### 5. Deep nesting with mixed . and ..
```typescript
it('resolve handles /a/./b/../c correctly', async () => {
  // From cwd=/, resolve('/a/./b/../c') should return /a/c
  // Test by: cd /, mkdir -p /a/b, touch /a/./b/../new.txt
  // Verify file created at /a/new.txt
})
```

### 6. Excessive .. from root stays root
```typescript
it('cd .. from / stays at /', async () => {
  const fs = makeMockFs()
  const sh = new AgenticShell(fs)
  await sh.exec('cd ..')
  expect((await sh.exec('pwd')).output).toBe('/')
  await sh.exec('cd ../../..')
  expect((await sh.exec('pwd')).output).toBe('/')
})
```

## Implementation Notes
- `normalizePath()` at `src/index.ts:307-314`: splits by `/`, filters empty, processes `..` and `.`
- `resolve()` at `src/index.ts:317-321`: prepends cwd if relative, calls normalizePath
- Root escape prevention: `..` when stack is empty is silently ignored (line 311)
- No source code changes needed

## Verification
- Run `npx vitest run test/resolve-path-normalization.test.ts` — all tests pass
- DBB criteria: DBB-m24-path-001 through DBB-m24-path-006 verified
