# Task Design: echo Output Redirection (> and >>)

## Files to Modify
- `src/index.ts`

## Implementation

### In exec() — parse redirection before pipe splitting
```typescript
async exec(command: string): Promise<string> {
  const redirectMatch = command.match(/^(.+?)\s*(>>|>)\s*(\S+)$/)
  if (redirectMatch) {
    const [, cmd, op, filePath] = redirectMatch
    if (this.fs.readOnly) return this.permError('echo', this.resolve(filePath))
    const output = await this.execSingle(cmd.trim())
    const absPath = this.resolve(filePath)
    if (op === '>>') {
      const existing = await this.fs.read(absPath)
      const prev = existing.error ? '' : (existing.content ?? '')
      await this.fs.write(absPath, prev ? `${prev}\n${output}` : output)
    } else {
      await this.fs.write(absPath, output)
    }
    return ''
  }
  // existing pipe/exec logic...
}
```

## Edge Cases
- `>>` to non-existent file: treat as empty existing content → create new file
- readOnly: return `Permission denied` before any write
- Redirection of non-echo commands: works for any command output

## Test Cases
1. `echo foo > /file.txt` → file contains "foo"
2. `echo new > /file.txt` on existing file → content replaced with "new"
3. `echo line2 >> /file.txt` (existing "line1") → content is "line1\nline2"
4. `echo hello >> /new.txt` (non-existent) → file created with "hello"
5. `echo foo > /file.txt` on readOnly → Permission denied, no file written
