# Design — grep stdin no-match exitCode 1

## File to modify
- `src/index.ts`

## Problem
`execWithStdin` returns plain `string`. The pipe loop calls `exitCodeFor(output)` at the end, but `exitCodeFor('')` returns 0, not 1.

## Fix: pipe loop in `exec()` (line ~84)

After each `execWithStdin` call, detect grep no-match (empty output from grep segment) and set exitCode 1:

```typescript
if (trimmed.includes(' | ')) {
  const segments = trimmed.split(' | ')
  let output = ''
  let exitCode = 0
  for (let i = 0; i < segments.length; i++) {
    if (i === 0) {
      output = await this.execSingle(segments[i].trim())
      if (this.isErrorOutput(output)) {
        exitCode = this.exitCodeFor(output)
        return { output, exitCode }
      }
    } else {
      const seg = segments[i].trim()
      const prev = output
      output = await this.execWithStdin(seg, prev)
      const segCmd = seg.trim().split(/\s+/)[0]
      if (segCmd === 'grep' && output === '') {
        exitCode = 1
      } else if (this.isErrorOutput(output)) {
        exitCode = this.exitCodeFor(output)
      }
    }
  }
  if (exitCode === 0) exitCode = this.exitCodeFor(output)
  return { output, exitCode }
}
```

## Edge cases
- grep with match → output non-empty → exitCode 0
- grep with no match → output '' → exitCode 1
- Non-grep stdin command returning '' → exitCode 0 (only grep triggers exitCode 1)

## Test cases
```typescript
it('returns exitCode 1 when grep stdin has no match', async () => {
  await fs.write('/f.txt', 'hello')
  const r = await shell.exec('cat /f.txt | grep nomatch')
  expect(r.exitCode).toBe(1)
  expect(r.output).toBe('')
})
it('returns exitCode 0 when grep stdin matches', async () => {
  await fs.write('/f.txt', 'hello')
  const r = await shell.exec('cat /f.txt | grep hello')
  expect(r.exitCode).toBe(0)
})
```
