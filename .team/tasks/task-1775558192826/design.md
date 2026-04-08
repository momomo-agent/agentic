# Task Design: 边界用例测试覆盖

## Objective
Add boundary case tests for: rm multi-path, rm -r deep nesting, grep -i invalid regex, 3+ stage pipes. Ensure edge cases are documented and tested.

## Files to Modify
- `src/index.test.ts` — add new test cases for boundary scenarios

## Test Cases to Add

### Test 1: rm multi-path
**Location**: `src/index.test.ts` (add to rm test suite)
```typescript
it('should delete multiple files in one command', async () => {
  await shell.exec('touch /file1.txt')
  await shell.exec('touch /file2.txt')
  await shell.exec('touch /file3.txt')
  const result = await shell.exec('rm /file1.txt /file2.txt /file3.txt')
  expect(result).toBe('')
  const ls = await shell.exec('ls /')
  expect(ls).not.toContain('file1.txt')
  expect(ls).not.toContain('file2.txt')
  expect(ls).not.toContain('file3.txt')
})
```

### Test 2: rm -r deep nesting (10+ levels)
**Location**: `src/index.test.ts` (add to rm test suite)
```typescript
it('should recursively delete deeply nested directories', async () => {
  // Create 10-level deep directory tree
  await shell.exec('mkdir -p /a/b/c/d/e/f/g/h/i/j')
  await shell.exec('touch /a/b/c/d/e/f/g/h/i/j/deep.txt')
  await shell.exec('touch /a/b/c/mid.txt')
  await shell.exec('touch /a/top.txt')

  const result = await shell.exec('rm -r /a')
  expect(result).toBe('')

  const ls = await shell.exec('ls /')
  expect(ls).not.toContain('a/')
})
```

### Test 3: grep -i invalid regex
**Location**: `src/index.test.ts` (add to grep test suite)
```typescript
it('should handle invalid regex patterns gracefully', async () => {
  await shell.exec('echo "test content" > /test.txt')

  // Invalid regex: unclosed bracket
  const result = await shell.exec('grep -i "[invalid" /test.txt')

  // Should return error, not crash
  expect(result).toContain('grep')
  expect(result.length).toBeGreaterThan(0)
})
```

**Implementation note**: Current grep implementation uses `new RegExp(pattern, ...)` which throws on invalid regex. Need to wrap in try-catch:

```typescript
// In grep() method around line 149-178
try {
  const regex = new RegExp(pattern, caseInsensitive ? 'i' : '')
  // ... existing logic
} catch (err) {
  return `grep: ${pattern}: Invalid regular expression`
}
```

### Test 4: 3+ stage pipe
**Location**: `src/index.test.ts` (add to pipe test suite)
```typescript
it('should handle 3+ stage pipes correctly', async () => {
  await shell.exec('echo "hello world\\ntest line\\nhello test" > /multi.txt')

  // 3-stage pipe: cat | grep | grep
  const result = await shell.exec('cat /multi.txt | grep hello | grep test')
  expect(result).toBe('hello test')

  // 4-stage pipe: cat | grep | grep | wc
  const wcResult = await shell.exec('cat /multi.txt | grep hello | grep world | wc')
  expect(wcResult).toContain('1') // 1 line
})
```

### Test 5: 3+ stage pipe with empty intermediate result
**Location**: `src/index.test.ts` (add to pipe test suite)
```typescript
it('should handle pipes where intermediate stage returns empty', async () => {
  await shell.exec('echo "hello world" > /test.txt')

  // Second grep matches nothing
  const result = await shell.exec('cat /test.txt | grep hello | grep nomatch | wc')
  expect(result).toContain('0') // 0 lines
})
```

## Code Changes Required

### Change 1: grep error handling for invalid regex
**File**: `src/index.ts`
**Location**: `grep()` method (line ~149) and `grepStream()` method (line ~180)

Add try-catch around `new RegExp()`:
```typescript
private async grep(args: string[]): Promise<string> {
  const flags = args.filter(a => a.startsWith('-'))
  const rest = args.filter(a => !a.startsWith('-'))
  const [pattern, ...paths] = rest
  if (!pattern) return 'grep: missing pattern'

  // Validate regex pattern
  try {
    new RegExp(pattern, flags.includes('-i') ? 'i' : '')
  } catch (err) {
    return `grep: ${pattern}: Invalid regular expression`
  }

  // ... rest of existing logic
}
```

Also update `grepStream()` and `execWithStdin()` grep handling with same validation.

## Testing Strategy
1. Add tests one at a time
2. Run test suite after each addition to ensure it passes
3. Verify boundary cases actually test edge behavior (not just happy path)
4. Final verification: all new tests pass, no regressions

## Success Criteria
- 5 new test cases added to src/index.test.ts
- All new tests pass
- grep handles invalid regex without crashing
- No regressions in existing tests
- Test count increases from 148+ to 153+
