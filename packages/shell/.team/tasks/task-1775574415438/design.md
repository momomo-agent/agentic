# Task Design: Input Redirection (<) Tests

## Scope
Input redirection `<` is already implemented in `exec()` (lines 26–58). This task adds tests to verify all code paths.

## File to Modify
- `src/index.test.ts` only (no source changes needed)

## Existing Implementation Summary (src/index.ts lines 26–58)
- Regex: `/^(.+?)\s+<\s+(\S+)((?:\s*>>?\s*\S+)?)$/`
- Reads redirect file via `fs.read()`
- Passes content as stdin to `execWithStdin(lhs, stdin)`
- Returns exitCode 1 if file not found
- Supports combined `cmd < infile > outfile` and `cmd < infile >> outfile`

## Test Cases
```typescript
describe('input redirection <', () => {
  it('grep pattern < file filters lines from file', async () => {
    await shell.exec('echo "hello world" > /f.txt')
    const r = await shell.exec('grep hello < /f.txt')
    expect(r.output).toBe('hello world')
    expect(r.exitCode).toBe(0)
  })

  it('grep no-match < file returns exitCode 1', async () => {
    await shell.exec('echo "hello" > /f.txt')
    const r = await shell.exec('grep xyz < /f.txt')
    expect(r.output).toBe('')
    expect(r.exitCode).toBe(1)
  })

  it('nonexistent redirect file returns error exitCode 1', async () => {
    const r = await shell.exec('grep foo < /missing.txt')
    expect(r.output).toContain('No such file or directory')
    expect(r.exitCode).toBe(1)
  })

  it('cmd < infile > outfile writes result to outfile', async () => {
    await shell.exec('echo "hello" > /in.txt')
    await shell.exec('grep hello < /in.txt > /out.txt')
    const r = await shell.exec('cat /out.txt')
    expect(r.output).toContain('hello')
  })
})
```

## Dependencies
- `execWithStdin` must handle grep stdin (already does, line 149–166)
- MockFileSystem must support write/read (already does)
