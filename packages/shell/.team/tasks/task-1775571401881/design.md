# Design — Output redirection with error source

## File to modify
- `src/index.ts`

## Problem
`writeMatch` branch (line ~73) calls `execSingle(lhs)`, then unconditionally writes to file. If source fails, file is still created.

## Fix: check exitCode before writing

```typescript
const writeMatch = trimmed.match(/^(.+?)>\s*(\S+)$/)
if (writeMatch) {
  const lhs = writeMatch[1].trim()
  const filePath = this.resolve(writeMatch[2])
  const werr = this.checkWritable('echo', filePath)
  if (werr) return { output: werr, exitCode: 1 }
  const output = await this.execSingle(lhs)
  const exitCode = this.exitCodeFor(output)
  if (exitCode !== 0) return { output, exitCode }   // <-- skip write
  await this.fs.write(filePath, output + '\n')
  return { output: '', exitCode: 0 }
}
```

Apply same pattern to `appendMatch` branch.

## Edge cases
- `cat /missing > /out.txt` → exitCode 1, no write
- `cat /missing >> /out.txt` → exitCode 1, no append
- `cat /existing > /out.txt` → exitCode 0, file written
- `echo hello > /out.txt` → exitCode 0, file written

## Test cases
```typescript
it('does not create file when source fails', async () => {
  const r = await shell.exec('cat /missing > /out.txt')
  expect(r.exitCode).toBe(1)
  const check = await fs.read('/out.txt')
  expect(check.error).toBeTruthy()
})
it('creates file when source succeeds', async () => {
  await fs.write('/src.txt', 'hi')
  const r = await shell.exec('cat /src.txt > /out.txt')
  expect(r.exitCode).toBe(0)
  const check = await fs.read('/out.txt')
  expect(check.content).toContain('hi')
})
```
