# Design — Input redirection (<) support

## Dependency
Requires task-1775568346972 (exit codes) to be complete first.

## File to modify
- `src/index.ts`
- `src/index.test.ts`

## Parsing in exec()

Add input redirection detection before pipe/output-redirect handling:

```typescript
// Match: <command> < <file> [> <outfile>]
const inputMatch = trimmed.match(/^(.+?)\s+<\s+(\S+)((?:\s*>+\s*\S+)?)$/)
```

If matched:
1. `lhs` = inputMatch[1].trim()
2. `redirectFile` = this.resolve(inputMatch[2])
3. `remainder` = inputMatch[3].trim() (optional output redirect)

## Execution logic

```typescript
if (inputMatch) {
  const r = await this.fs.read(redirectFile)
  if (r.error) return { output: `bash: ${inputMatch[2]}: No such file or directory`, exitCode: 1 }
  const stdin = r.content ?? ''
  let output = await this.execWithStdin(lhs, stdin)
  // if remainder has >, handle output redirect
  const exitCode = this.exitCodeFor(output)
  if (remainder matches >) { write output to file; output = '' }
  return { output, exitCode }
}
```

## Combined `< file > outfile`

Parse remainder for `>` or `>>` after input redirect is resolved. Reuse existing write/append logic.

## Edge cases
- Redirect file does not exist → exitCode 1, error message
- Redirect file is empty → stdin = '', command runs with empty input
- `grep pattern < /file` with no match → output = '', exitCode 1
- `< file` with no command → treat as error

## Test cases (DBB-m12-006 to 009)
- `grep hello < /data.txt` where file has "hello\nworld" → output "hello", exitCode 0
- `grep pattern < /nonexistent` → exitCode 1, error message
- `grep xyz < /data.txt` (no match) → output '', exitCode 1
- `grep hello < /input.txt > /output.txt` → /output.txt written, exitCode 0
