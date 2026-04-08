# Technical Design — task-1775587050073: Add find -type test coverage

## Goal
Add test coverage for `find -type f` and `find -type d` filtering. Existing tests in `test/find-recursive.test.ts` and `test/mkdir-find-cd.test.ts` cover basic scenarios — add edge cases.

## Files to Modify
- `test/find-recursive.test.ts` — add new edge case tests

## Existing Coverage
Tests cover: -type f flat, -type d flat, -type f recursive, -type d recursive, no -type returns all, combined -type f -name, combined -name -type d, relative paths.

## Additional Test Cases to Add

### 1. -type f on empty directory returns empty
```typescript
it('find /empty -type f returns empty string', async () => {
  const fs = makeMockFs({ ls: vi.fn().mockResolvedValue([]) })
  const sh = new AgenticShell(fs)
  const out = (await sh.exec('find /empty -type f')).output
  expect(out).toBe('')
})
```

### 2. -type d on directory with only files returns empty
```typescript
it('find /dir -type d returns nothing when only files exist', async () => {
  // Setup: ls returns only file entries, no dir entries
  // Execute: find /dir -type d
  // Assert: empty output (the root dir itself is not listed)
})
```

### 3. -type combined with -name in deeply nested tree
```typescript
it('find /project -type f -name "*.ts" finds .ts files at all depths', async () => {
  // Setup: /project/src/index.ts, /project/src/lib/utils.ts, /project/test/a.ts, /project/README.md
  // Execute: find /project -type f -name "*.ts"
  // Assert: index.ts, utils.ts, a.ts found; README.md excluded
})
```

### 4. -type d with deeply nested directories
```typescript
it('find /a -type d returns all directories at all depths', async () => {
  // Setup: /a/b/c/d tree
  // Execute: find /a -type d
  // Assert: /a/b, /a/b/c, /a/b/c/d all returned
})
```

### 5. -type f on directory with only directories
```typescript
it('find /dir -type f returns empty when only directories exist', async () => {
  // Setup: ls returns only dir entries
  // Execute: find /dir -type f
  // Assert: empty output
})
```

## Implementation Notes
- Uses `findRecursive()` at `src/index.ts:526-544`
- `typeFilter` compared against `entry.type` at line 539
- `entry.type` comes from `fs.ls()` — values are 'file' or 'dir'
- No source code changes needed

## Verification
- Run `npx vitest run test/find-recursive.test.ts` — all tests pass
- DBB criteria: DBB-m24-find-type-001 through DBB-m24-find-type-006 verified
