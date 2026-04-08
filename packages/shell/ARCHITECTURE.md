# Architecture — Agentic Shell

## Overview
Agentic Shell is a UNIX-like shell command interface built on top of AgenticFileSystem. It provides familiar shell commands (ls, cat, grep, etc.) that work across browser, Electron, and Node.js environments.

## Design Principles

### Single-File Architecture
**Decision**: All shell logic lives in `src/index.ts` (~978 lines).

**Rationale**:
- Simplicity: Easy to understand, navigate, and modify
- No module boundaries to maintain
- Fast iteration during early development
- Minimal build complexity

**Trade-offs**:
- File will grow as commands are added
- Less modular than multi-file architecture
- Harder to test individual commands in isolation

**Future**: If file exceeds 1000 lines, consider splitting into:
- `src/shell.ts` — core shell logic (exec, pipe, parseArgs)
- `src/commands/` — one file per command or command group

### Command Pattern
Each command is implemented as a private method on `AgenticShell` class:
```typescript
private async <command>(args: string[]): Promise<string>
```

**Responsibilities**:
- Parse command-specific flags from args array
- Validate inputs
- Call AgenticFileSystem methods
- Format output as string
- Return error messages (not throw exceptions)

**Example**:
```typescript
private async cat(args: string[]): Promise<string> {
  const paths = args.filter(a => !a.startsWith('-'))
  if (!paths.length) return 'cat: missing operand'
  const results = await Promise.all(paths.map(async p => {
    const r = await this.fs.read(this.resolve(p))
    return r.error ? this.fsError('cat', p, r.error) : (r.content ?? '')
  }))
  return results.join('\n')
}
```

### Pipe Support
Pipes are handled at the `exec()` level:
1. Split command string by ` | `
2. Execute first segment with `execSingle()`
3. Execute subsequent segments with `execWithStdin()`, passing previous output as stdin
4. Return final output

**Stdin-aware commands**: grep (filters stdin lines)
**Stdin-unaware commands**: fall back to `execSingle()` (ignore stdin)

### Path Resolution
**Current Working Directory (cwd)**: Stored as instance variable, defaults to `/`

**Path resolution logic**:
1. `resolve(path)` — converts relative path to absolute
2. `normalizePath(path)` — handles `.` and `..` segments
3. Root escape prevention: `..` from `/` stays at `/`

**Example**:
```typescript
resolve('../foo') from cwd=/a/b → /a/foo
resolve('../../foo') from cwd=/a/b/c → /a/foo
resolve('../..') from cwd=/a/b → /
```

## AgenticFileSystem Interface Contract

The shell depends on `AgenticFileSystem` interface (from `agentic-filesystem` package):

```typescript
interface AgenticFileSystem {
  // Required methods
  read(path: string): Promise<{ content?: string; error?: string }>
  write(path: string, content: string): Promise<void>
  ls(path: string): Promise<Array<{ name: string; type: 'file' | 'dir' }>>
  delete(path: string): Promise<void>
  grep(pattern: string): Promise<Array<{ path: string; line: number; content: string }>>

  // Optional methods
  mkdir?(path: string): Promise<void>
  readStream?(path: string): AsyncIterable<string>

  // Optional property
  readOnly?: boolean
}
```

**Assumptions**:
- `read()` returns `{ error }` for non-existent files (not throw)
- `ls()` returns empty array for empty directories
- `ls()` throws for non-existent directories
- `delete()` throws for non-existent files
- `grep()` searches all files in filesystem (no path filtering at fs level)

**Workarounds**:
- If `mkdir` not available, use `write(path + '/.keep', '')` to create directories
- If `readStream` not available, fall back to `read()` for grep

## Extension Points

### Adding a New Command
1. Add case to `execSingle()` switch statement
2. Implement private method: `private async <cmd>(args: string[]): Promise<string>`
3. Parse flags from args array
4. Call fs methods
5. Return formatted output or error message
6. Add tests to `src/index.test.ts`

**Note**: Glob expansion happens automatically in path arguments via `expandPathArgs()` before command execution. Commands receive already-expanded paths.

### Adding Stdin Support to a Command
1. Add case to `execWithStdin()` method
2. Parse stdin string (usually split by `\n`)
3. Process stdin with command logic
4. Return formatted output

### Adding a New Flag to Existing Command
1. Check for flag in args: `args.includes('-x')`
2. Modify command logic based on flag
3. Update tests

## Error Handling

### Standard Error Format
All errors follow UNIX convention:
```
<command>: <path>: <reason>
```

Examples:
- `cat: /nonexistent: No such file or directory`
- `mkdir: /a/b/c: No such file or directory`
- `rm: /: refusing to remove '/'`

### Error Propagation
- Commands return error strings (not throw exceptions)
- Pipe errors: if left command fails, right command receives empty stdin (short-circuit behavior)
- Exit codes: `exec()` returns `{ output: string; exitCode: number }` with codes 0 (success), 1 (general error), 2 (command/usage error)

### Pipe Error Short-Circuit
When a command in a pipeline produces an error output (detected by `isErrorOutput`), the pipeline short-circuits:
1. The error output is captured and the exit code is set
2. An empty string is passed as stdin to subsequent pipeline segments
3. Subsequent segments still execute (with empty input) so their error output can appear
4. The final exit code reflects the first error encountered

Example: `cat /missing | grep foo` — `cat` error is captured, `grep` receives empty stdin, returns exit code 1

### Permission Checking
If `fs.readOnly === true` (read from `AgenticFileSystem.readOnly` property), write operations return:
```
<command>: <path>: Permission denied
```

Checked by `checkWritable()` helper method, which casts `fs` to `any` and reads `fs.readOnly` directly.

## Testing Strategy

### Test Organization
All tests in `src/index.test.ts` using Vitest.

### Test Structure
```typescript
describe('command', () => {
  let shell: AgenticShell
  let fs: MockFileSystem

  beforeEach(() => {
    fs = new MockFileSystem()
    shell = new AgenticShell(fs)
  })

  it('should handle happy path', async () => { ... })
  it('should handle error case', async () => { ... })
  it('should handle boundary case', async () => { ... })
})
```

### Coverage Goals
- Statement coverage ≥ 80%
- Branch coverage ≥ 75%
- Every command has at least 3 tests

## Performance Considerations

### Streaming for Large Files
`grep` uses `fs.readStream()` when available to avoid loading entire file into memory.

### Pagination for Large Directories
`ls` supports `--page` and `--page-size` flags to limit output.

### Recursive Operations
`find` and `rm -r` use recursive traversal with cycle detection (visited set).

## Cross-Environment Compatibility

The shell works in:
- **Browser**: with in-memory or IndexedDB filesystem
- **Electron**: with native filesystem
- **Node.js**: with native filesystem

**Key**: All environment differences are abstracted by AgenticFileSystem interface.

## Implemented Features

### Exit Codes
`exec()` returns `{ output: string; exitCode: number }` with standard UNIX codes:
- `0`: Success
- `1`: General error (file not found, permission denied, etc.)
- `2`: Command/usage error (command not found, missing operand, invalid regex)

Exit codes are determined by `exitCodeFor()` which inspects the output string for error patterns.

### Glob Pattern Support
Glob expansion (`*`, `?`, `[abc]`, `[!abc]`) is supported via three methods:
- `matchGlob(name, pattern)` — tests a filename against a glob pattern (converts to regex)
- `expandGlob(pattern, dir)` — expands a single-directory glob against `fs.ls()` results
- `expandRecursiveGlob(baseDir, pattern)` — recursive `**` glob expansion using stack-based traversal
- `expandPathArgs(args)` — automatically expands glob patterns in command arguments

Glob expansion happens automatically in path arguments before command execution. Supports `**` for recursive directory traversal.

### Environment Variables
- `$VAR` and `${VAR}` syntax via `substituteEnv()` — performed before command execution
- `export KEY=VALUE` — sets environment variables
- `VAR=value` assignment — inline variable assignment
- Default variables: `HOME=/`, `PWD=<cwd>`, `PATH=/usr/bin:/bin`

### Command Substitution
- `$(cmd)` — executes inner command and substitutes output
- `` `cmd` `` — backtick substitution (same behavior)
- Max recursion depth: 3 levels
- Only substitutes output when inner command exits with code 0

### Redirection
- `> file` — output redirection (overwrites)
- `>> file` — output redirection (appends)
- `cmd < file` — input redirection (reads file as stdin)
- Combinations: `cmd < input > output` and `cmd < input >> output`
- Permission checking via `checkWritable()` before writes

### Background Jobs & Job Control
- `cmd &` — runs command in background, returns `[jobId] jobId`
- `jobs` — lists background jobs with status (running/stopped/done)
- `fg [jobId]` — brings background job to foreground, returns its output
- `bg [jobId]` — resumes stopped job (placeholder implementation)

## Future Enhancements

### Potential Improvements
- Tab completion
- Aliases (alias cmd='...')
- History (history, !n)
- Signal handling (Ctrl+C)

### Refactoring Triggers
- File exceeds 1000 lines → split into modules
- More than 20 commands → group into categories
- Complex flag parsing → extract flag parser utility