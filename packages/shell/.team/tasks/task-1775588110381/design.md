# Technical Design — Add Cross-Environment Consistency Tests

## Problem
Existing cross-environment tests (`src/index.test.ts:484-582`) cover basic operations (ls, cat, grep, pwd, cd, path resolution) but miss important scenarios.

## Scope
Expand the `runConsistencyTests()` function to cover additional behaviors that must be consistent across browser/Electron/Node backends.

## Files to Modify
- `src/index.test.ts` — expand `runConsistencyTests()` and backend mocks

## Test Cases to Add

### 1. Error Format Normalization
Both backends may return different error messages (e.g., "not found" vs "No such file"). The shell normalizes these via `fsError()`.

```typescript
it('cat missing file returns normalized error across envs', async () => {
  const out = await run(sh, 'cat /missing')
  expect(out).toMatch(/cat: \/missing: No such file or directory/)
})
```

### 2. Glob Expansion Consistency
```typescript
it('cat *.txt expands consistently across envs', async () => {
  // Mock ls returns same file list in both envs
  // Verify cat *.txt returns same content
})
```

### 3. Pipe Behavior Consistency
```typescript
it('cat | grep pipe works consistently', async () => {
  const out = await run(sh, 'cat /file.txt | grep hello')
  expect(out).toBe('hello world')
})
```

### 4. Exit Code Consistency
```typescript
it('exit codes are consistent across envs', async () => {
  const r1 = await sh.exec('cat /missing')
  expect(r1.exitCode).toBe(1)
  const r2 = await sh.exec('ls /')
  expect(r2.exitCode).toBe(0)
})
```

### 5. Edge Cases
```typescript
it('empty file returns empty string', async () => {
  // Both envs: read returns { content: '' }
  const out = await run(sh, 'cat /empty.txt')
  expect(out).toBe('')
})

it('empty directory ls returns empty string', async () => {
  const out = await run(sh, 'ls /emptydir')
  expect(out).toBe('')
})
```

## Mock Backend Updates
Update `makeNodeMock()` and `makeBrowserMock()` to include:
- Empty file: `/empty.txt` with `{ content: '' }`
- Empty directory: `/emptydir` returning `[]`
- Error response normalization (both should trigger `fsError` normalization)

## Dependencies
- None — all changes in `src/index.test.ts`
