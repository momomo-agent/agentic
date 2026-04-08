# M12 Technical Design — Exit Codes, Input Redirection & Glob Expansion

## Overview

Three independent features that extend the `exec()` API and command capabilities in `src/index.ts`.

## 1. Exit Codes (task-1775568346972)

### Return type change
`exec()` changes from `Promise<string>` to `Promise<{ output: string; exitCode: number }>`.

All internal methods (`execSingle`, `execWithStdin`, private command methods) remain `Promise<string>` — only `exec()` wraps the result.

### Exit code rules
- `0` — success
- `1` — runtime error (file not found, permission denied, etc.)
- `2` — misuse (missing required arg, invalid flag)

### Detection logic in `exec()`
After getting the string output from internal methods, determine exit code:
- If output matches error pattern (`/^\w+: .+: .+/`) → exitCode 1
- If output matches misuse pattern (e.g. `"missing operand"`, `"missing pattern"`, `"command not found"`) → exitCode 2
- Otherwise → exitCode 0

Pipe chains: track exit code of each stage; final exit code = last non-zero, or 0 if all succeed.

## 2. Input Redirection (task-1775568352370)

### Parsing in `exec()`
Before pipe/redirect handling, detect `< filename` pattern:
```
/^(.+?)\s+<\s+(\S+)(.*)$/
```
Extract: `lhs` (command), `redirectFile` (path), optional remainder (for `>` chaining).

### Execution
1. Resolve `redirectFile` path
2. `fs.read(resolvedPath)` — if error, return `{ output: "bash: redirectFile: No such file or directory", exitCode: 1 }`
3. Pass file content as stdin to `execWithStdin(lhs, content)`

### Interaction with `>`
`< file > outfile` — parse `<` first, execute with stdin, then write output to outfile.

## 3. Glob Expansion (task-1775568357122)

### Utility function
```typescript
private async expandGlob(pattern: string, dir: string): Promise<string[]>
```
- If pattern contains no `*` or `?`, return `[pattern]`
- `ls(dir)` to get entries
- Match each entry name against glob using `matchGlob(name, pattern)`

### Glob matcher
```typescript
private matchGlob(name: string, pattern: string): boolean
```
Convert glob to regex: `*` → `.*`, `?` → `.`, escape other regex chars. Test against name.

### Integration points
- `ls()`: if path arg contains `*` or `?`, expand in cwd, filter entries
- `grep()`: if file args contain `*` or `?`, expand each in cwd before reading

## File to modify
- `src/index.ts` — all changes here
- `src/index.test.ts` — new tests per DBB criteria
