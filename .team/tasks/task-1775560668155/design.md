# Design: echo 输出重定向支持

## Files
- `src/index.ts` — modify `exec()` to detect redirection before pipe handling
- `src/index.test.ts` — add tests

## Algorithm

### exec(command) — add redirection detection

Insert before the pipe check:

```typescript
// Check for >> before > (order matters)
const appendMatch = trimmed.match(/^(.+?)>>\s*(\S+)$/)
if (appendMatch) {
  const lhs = appendMatch[1].trim()
  const filePath = this.resolve(appendMatch[2])
  const werr = this.checkWritable('echo', filePath)
  if (werr) return werr
  const output = await this.execSingle(lhs)
  const existing = await this.fs.read(filePath)
  const current = existing.error ? '' : (existing.content ?? '')
  await this.fs.write(filePath, current + output + '\n')
  return ''
}
const writeMatch = trimmed.match(/^(.+?)>\s*(\S+)$/)
if (writeMatch) {
  const lhs = writeMatch[1].trim()
  const filePath = this.resolve(writeMatch[2])
  const werr = this.checkWritable('echo', filePath)
  if (werr) return werr
  const output = await this.execSingle(lhs)
  await this.fs.write(filePath, output + '\n')
  return ''
}
```

Note: `checkWritable` uses the command name for the error message. Pass `'echo'` since redirection is an echo feature for now.

## Edge Cases
- `echo hello > file.txt` readOnly → `echo: file.txt: Permission denied`
- `echo >> file.txt` (no text) → appends empty line
- `echo text` (no redirection) → unchanged behavior, returns text
- `>>` check must come before `>` check to avoid misparse

## Test Cases
1. `echo hello > /f.txt` → f.txt contains "hello\n"
2. `echo world >> /f.txt` after above → f.txt contains "hello\nworld\n"
3. `echo hi > /f.txt` twice → f.txt contains "hi\n" (overwrite)
4. `echo hi > /f.txt` readOnly → permission error
5. `echo no-redirect` → returns "no-redirect" as before
