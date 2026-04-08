# Task Design: Fix standalone grep no-match exit code

## File to Modify

`src/index.ts` — `execPipeline()` method, lines 188-189

## Current Code (buggy)

```typescript
// Line 188-189 in execPipeline()
const output = await this.execSingle(trimmed)
return { output, exitCode: this.exitCodeFor(output) }
```

**Problem**: `exitCodeFor('')` returns 0 for empty string. When standalone grep finds no matches, output is `''`, but UNIX convention requires exit code 1 (no match found).

**Why pipe case works**: Lines 178-180 already handle this:
```typescript
const segCmd = segments[i].trim().split(/\s+/)[0]
if (exitCode === 0) {
  if (segCmd === 'grep' && output === '') exitCode = 1
  // ...
}
```

## Fix

```typescript
// Lines 188-189 — replace with:
const output = await this.execSingle(trimmed)
const cmd = trimmed.split(/\s+/)[0]
const exitCode = (cmd === 'grep' && output === '') ? 1 : this.exitCodeFor(output)
return { output, exitCode }
```

**Logic**:
1. Extract command name from trimmed input (same pattern as line 178)
2. If command is `grep` and output is empty (no match), return exitCode 1
3. Otherwise, use existing `exitCodeFor()` logic (handles errors, normal output)

## Edge Cases

| Case | Input | Expected exitCode | Notes |
|------|-------|-------------------|-------|
| grep no match | `grep "xyz" /f.txt` | 1 | The bug — must return 1 |
| grep match | `grep "hello" /f.txt` | 0 | Normal match |
| grep -i no match | `grep -i "xyz" /f.txt` | 1 | Case-insensitive still has cmd='grep' |
| grep error | `grep "pat" /nonexistent` | 1 | Error path returns non-empty error string, so exitCodeFor handles it |
| grep invalid regex | `grep "[invalid" /f.txt` | 2 | exitCodeFor handles this |
| cat empty file | `cat /empty.txt` | 0 | cmd != 'grep', uses exitCodeFor('') → 0 ✓ |
| non-grep command | `ls /emptydir` | 0 | cmd != 'grep', normal exitCodeFor |

## Test Cases to Add

Add to an existing test file (e.g., `test/exit-codes.test.ts` or `test/dbb.test.ts`):

```typescript
describe('standalone grep exit code (m29)', () => {
  let shell: AgenticShell
  let fs: MockFileSystem

  beforeEach(() => {
    fs = new MockFileSystem()
    shell = new AgenticShell(fs)
    fs.write('/f.txt', 'hello\nworld\n')
  })

  it('should return exitCode 1 for standalone grep no-match', async () => {
    const result = await shell.exec('grep "xyz" /f.txt')
    expect(result.exitCode).toBe(1)
    expect(result.output).toBe('')
  })

  it('should return exitCode 0 for standalone grep match', async () => {
    const result = await shell.exec('grep "hello" /f.txt')
    expect(result.exitCode).toBe(0)
    expect(result.output).toContain('hello')
  })

  it('should return exitCode 1 for standalone grep -i no-match', async () => {
    const result = await shell.exec('grep -i "xyz" /f.txt')
    expect(result.exitCode).toBe(1)
    expect(result.output).toBe('')
  })

  it('should return exitCode 1 for standalone grep on nonexistent file', async () => {
    const result = await shell.exec('grep "pat" /nonexistent')
    expect(result.exitCode).toBe(1)
  })

  it('should still return exitCode 0 for cat of empty file', async () => {
    fs.write('/empty.txt', '')
    const result = await shell.exec('cat /empty.txt')
    expect(result.exitCode).toBe(0)
  })
})
```

## Dependencies

- None — self-contained fix in `execPipeline()`
- Must not break existing pipe/input-redirect grep exit code tests

## Verification

1. Run: `vitest run test/exit-codes.test.ts` — all pass including new tests
2. Run: `vitest run` — no regressions across full suite
3. Manual: `grep "nonexistent" /some/file` returns `{ output: '', exitCode: 1 }`
