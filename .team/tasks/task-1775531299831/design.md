# Task Design: pipe 支持

## Files to Modify
- `src/index.ts` — `exec()` method (lines 10–31)

## Changes

Detect `|` before `parseArgs`. Split on ` | `, execute left, pass output as input to right.

```typescript
async exec(command: string): Promise<string> {
  const trimmed = command.trim()

  // Pipe handling — split on ' | ', execute left-to-right
  if (trimmed.includes(' | ')) {
    const segments = trimmed.split(' | ')
    let output = ''
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i].trim()
      if (i === 0) {
        output = await this.execSingle(seg)
      } else {
        // Inject previous output as stdin for commands that read from stdin
        // For grep: prepend output as a virtual file via inline matching
        output = await this.execWithStdin(seg, output)
      }
    }
    return output
  }

  return this.execSingle(trimmed)
}
```

Rename current `exec` body to `execSingle(command: string): Promise<string>`.

Add `execWithStdin(command: string, stdin: string): Promise<string>`:

```typescript
private async execWithStdin(command: string, stdin: string): Promise<string> {
  const parts = this.parseArgs(command)
  const [cmd, ...args] = parts
  if (cmd === 'grep') {
    const flags = args.filter(a => a.startsWith('-'))
    const rest = args.filter(a => !a.startsWith('-'))
    const [pattern] = rest
    if (!pattern) return 'grep: missing pattern'
    const regex = new RegExp(pattern)
    const lines = stdin.split('\n').filter(l => regex.test(l))
    return lines.join('\n')
  }
  // Other commands: pass stdin as-is or unsupported
  return this.execSingle(command)
}
```

## Edge Cases
- Left command fails (returns error string) → pass error string to right; grep finds no match → empty output
- `echo "hello" | grep hello` → "hello"
- `cat /nonexistent | grep pattern` → error from cat propagates, grep on error string likely returns empty

## Test Cases (DBB-004, DBB-005, DBB-006)
- `cat file | grep pattern` → only matching lines
- `echo "hello world" | grep hello` → "hello world"
- `cat /nonexistent | grep pattern` → empty or error string, no crash
