# Technical Design — Pipe Failure Propagation Fix

## Problem
In `exec()`, when the left side of a pipe fails (e.g. `cat /nonexistent | grep foo`), the error string is silently passed as stdin to the right command. This is correct UNIX behavior — stderr is separate from stdout — but the current implementation conflates them: error messages returned by commands are indistinguishable from normal output.

The fix: treat any output from a left-side command that matches the error format `<cmd>: <path>: <reason>` as an error, and propagate it directly as the final output rather than feeding it into the next stage.

## File to Modify
- `src/index.ts` — `exec()` method, pipe handling block (lines 48–57)

## Algorithm

```
isErrorOutput(output: string): boolean
  - return /^\w+: .+: .+/.test(output.trimStart().split('\n')[0])
```

In the pipe loop, after executing segment `i === 0`:
- If `isErrorOutput(output)`, break early and return `output` directly.

## Function Signatures

```typescript
private isErrorOutput(output: string): boolean
```

No changes to public API.

## Change in exec() pipe block

```typescript
if (trimmed.includes(' | ')) {
  const segments = trimmed.split(' | ')
  let output = ''
  for (let i = 0; i < segments.length; i++) {
    if (i === 0) {
      output = await this.execSingle(segments[i].trim())
      if (this.isErrorOutput(output)) return output  // propagate error
    } else {
      output = await this.execWithStdin(segments[i].trim(), output)
    }
  }
  return output
}
```

## Edge Cases
- Multi-line output where first line is an error: check only first line
- Commands that legitimately output text matching error pattern (e.g. `echo "foo: bar: baz"`): acceptable false positive — `echo` never returns errors, so this is rare and acceptable given single-file architecture constraint
- Empty output from left side: not an error, pass empty string as stdin (existing behavior preserved)

## Test Cases (in `src/index.test.ts`)

```typescript
describe('pipe error propagation', () => {
  it('should propagate left-side error instead of passing to right command', async () => {
    const result = await shell.exec('cat /nonexistent | grep foo')
    expect(result).toBe('cat: /nonexistent: No such file or directory')
  })

  it('should not propagate when left side succeeds', async () => {
    await fs.write('/file.txt', 'hello\nworld')
    const result = await shell.exec('cat /file.txt | grep hello')
    expect(result).toContain('hello')
  })

  it('should propagate error in middle of multi-segment pipe', async () => {
    const result = await shell.exec('cat /nonexistent | grep foo | wc -l')
    expect(result).toBe('cat: /nonexistent: No such file or directory')
  })
})
```

## Dependencies
- No new imports or packages required
- No changes to `AgenticFileSystem` interface
