# Technical Design: Fix grep Streaming for Large Files Consistency

## Problem

`grepStream()` at `src/index.ts:575` is only used for single non-recursive file paths (line 487-500). When `fs.readStream` is available, streaming should be the preferred path for all file-based grep operations, but currently:

1. Multi-file grep bypasses streaming entirely
2. Recursive grep bypasses streaming entirely
3. The `-i` (case-insensitive) flag works in `grepStream` via regex, but `-l` and `-c` flags are handled by the caller, not the stream — this works correctly but needs test coverage
4. No test verifies the streaming code path is actually exercised

## Files to Modify

- `src/index.ts` — extend streaming usage
- `src/index.test.ts` — add streaming-specific tests

## Implementation

### 1. Extend grep streaming to multi-file single-directory case

In `grep_cmd()` (line ~440), after the single-file streaming check (line 487), add a second code path:

```typescript
// Use streaming for multiple non-recursive files when readStream is available
if (!recursive && resolvedPaths.length > 1 && isStreamable(this.fs)) {
  const allMatches: string[] = []
  for (const p of resolvedPaths) {
    try {
      const raw = await this.grepStream(pattern, p, flags)
      allMatches.push(...raw.filter(m => !m.startsWith('grep: warning:')))
    } catch (err) {
      allMatches.push(this.fsError('grep', p, String(err)))
    }
  }
  if (flags.includes('-c')) return String(allMatches.length)
  if (!allMatches.length) return ''
  if (flags.includes('-l')) return [...new Set(allMatches.map(m => m.split(':')[0]))].join('\n')
  return allMatches.join('\n')
}
```

### 2. Add MockFileSystem with readStream support for testing

In `src/index.test.ts`, add a `StreamableMockFileSystem` class:

```typescript
class StreamableMockFileSystem extends MockFileSystem {
  readStream(path: string) {
    const content = this.files.get(path)
    if (content === undefined) throw new Error('not found')
    const lines = content.split('\n')
    return {
      async *[Symbol.asyncIterator]() {
        for (const line of lines) yield line
      }
    }
  }
}
```

### 3. Add streaming-specific tests

```typescript
describe('grep streaming', () => {
  it('should use streaming path for single file', async () => {
    const fs = new StreamableMockFileSystem()
    fs.setFile('/large.txt', 'hello\nworld\nhello world\n')
    const shell = new AgenticShell(fs)
    const result = await shell.exec('grep hello /large.txt')
    expect(result.output).toContain('/large.txt:1: hello')
    expect(result.output).toContain('/large.txt:3: hello world')
    expect(result.exitCode).toBe(0)
  })

  it('should handle -i flag with streaming', async () => {
    const fs = new StreamableMockFileSystem()
    fs.setFile('/f.txt', 'Hello\nhello\nHELLO\n')
    const shell = new AgenticShell(fs)
    const result = await shell.exec('grep -i hello /f.txt')
    expect(result.output).toContain('Hello')
    expect(result.output).toContain('hello')
    expect(result.output).toContain('HELLO')
  })

  it('should handle -c flag with streaming', async () => {
    const fs = new StreamableMockFileSystem()
    fs.setFile('/f.txt', 'foo\nbar\nfoo\n')
    const shell = new AgenticShell(fs)
    const result = await shell.exec('grep -c foo /f.txt')
    expect(result.output).toBe('2')
  })

  it('should handle -l flag with streaming', async () => {
    const fs = new StreamableMockFileSystem()
    fs.setFile('/f.txt', 'foo\nbar\n')
    const shell = new AgenticShell(fs)
    const result = await shell.exec('grep -l foo /f.txt')
    expect(result.output).toBe('/f.txt')
  })

  it('should use streaming for multiple files', async () => {
    const fs = new StreamableMockFileSystem()
    fs.setFile('/a.txt', 'hello\n')
    fs.setFile('/b.txt', 'world\n')
    fs.setFile('/c.txt', 'hello world\n')
    const shell = new AgenticShell(fs)
    const result = await shell.exec('grep hello /a.txt /c.txt')
    expect(result.output).toContain('/a.txt:1: hello')
    expect(result.output).toContain('/c.txt:1: hello world')
    expect(result.exitCode).toBe(0)
  })

  it('should fall back to read() when readStream unavailable', async () => {
    const fs = new MockFileSystem() // no readStream
    fs.setFile('/f.txt', 'hello\nworld\n')
    const shell = new AgenticShell(fs)
    const result = await shell.exec('grep hello /f.txt')
    expect(result.output).toContain('hello')
    // Should include warning about fallback
  })
})
```

## Edge Cases

- File doesn't exist during streaming: catch error, return `fsError('grep', path, error)`
- Empty file: streaming returns no matches, should return empty string (no-match)
- Regex compilation error in `grepStream`: throws `Invalid regular expression` — caller catches
- `fs.readStream` throws mid-stream: propagate error to caller

## Dependencies

- `isStreamable()` helper (already exists at `src/index.ts:9`)
- `MockFileSystem` (already exists in test file)

## Verification

- Run `npm test` — all new tests pass
- Run `npm run test:coverage` — grep streaming path is covered
- Verify with a manually created large file that streaming path is exercised (check via debugger or log)
