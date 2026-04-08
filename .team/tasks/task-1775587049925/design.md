# Technical Design — task-1775587049925: Add ls pagination test coverage

## Goal
Add comprehensive test coverage for `ls --page` and `--page-size` flags to close PRD gap. Existing file `test/ls-pagination.test.ts` has 9 tests — add additional edge case tests.

## Files to Modify
- `test/ls-pagination.test.ts` — add new test cases

## Existing Coverage (9 tests)
Tests already cover: page 1/2/3 slicing, out-of-range page, default page-size=20, page 0/-1 fallback, -l flag with pagination, backward compatibility.

## Additional Test Cases to Add

### 1. Pagination with hidden files (-a flag)
```typescript
it('ls -a --page 1 --page-size 3 includes dotfiles in pagination', async () => {
  // Setup: directory with .hidden and visible files
  // Execute: ls -a --page 1 --page-size 3 /dir
  // Assert: . and .. and .hidden are included in count
})
```

### 2. --page-size 0 falls back to default
```typescript
it('ls --page 1 --page-size 0 defaults to page-size 20', async () => {
  // Execute: ls --page 1 --page-size 0 /dir
  // Assert: behaves like default page-size 20
})
```

### 3. Negative page-size falls back to default
```typescript
it('ls --page 1 --page-size -5 defaults to page-size 20', async () => {
  // Execute: ls --page 1 --page-size -5 /dir
  // Assert: behaves like default page-size 20
})
```

### 4. Pagination exactly at boundary
```typescript
it('ls --page 1 --page-size 7 returns all 7 entries exactly', async () => {
  // Setup: directory with exactly 7 entries
  // Execute: ls --page 1 --page-size 7 /dir
  // Assert: exactly 7 entries returned
})
```

### 5. Page beyond last returns empty (with -l)
```typescript
it('ls -l --page 5 --page-size 3 returns empty for 7-entry dir', async () => {
  // Execute: ls -l --page 5 --page-size 3 /bigdir
  // Assert: empty string
})
```

## Implementation Notes
- Use existing `makeMockFs()` pattern from the file
- Mock `ls` to return arrays of varying sizes
- Parse output with `split('\n').filter(l => l)` for entry counting
- No source code changes needed — all existing behavior is correct

## Test Pattern
```typescript
const mockFs = {
  ls: async (path: string) => {
    if (path === '/dir') return Array.from({length: N}, (_, i) => ({
      name: `file${i+1}.txt`, type: 'file'
    }))
    return []
  },
  read: async () => ({ content: '' }),
  write: async () => {},
  delete: async () => {},
  grep: async () => [],
  mkdir: async () => {},
}
```

## Verification
- Run `npx vitest run test/ls-pagination.test.ts` — all tests pass
- DBB criteria: DBB-m24-ls-page-001 through DBB-m24-ls-page-008 verified
