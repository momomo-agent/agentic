# Technical Design — task-1775585010000: Update ARCHITECTURE.md

## File to Modify
`/Users/kenefe/LOCAL/momo-agent/projects/agentic-shell/ARCHITECTURE.md`

## Changes Required

### 1. Exit Codes — Error Propagation Section (line ~147)

**Current text** (line 147):
```
- Exit codes: not currently implemented (all commands return strings)
```

**Replace with**:
```
- Exit codes: `exec()` returns `{ output: string; exitCode: number }`. Exit code 0 for success, 1 for errors (matches UNIX convention). Commands like `grep` return exit code 1 when no match found.
```

### 2. Glob Expansion — New Section

Add a new subsection under "Extension Points" (after "Adding a New Flag to Existing Command"):

```markdown
### Glob Expansion

Glob patterns are expanded in command arguments before execution.

**Supported patterns**:
- `*` — matches any characters (except `/`)
- `?` — matches single character
- `[abc]` — matches any character in set
- `[a-z]` — matches character range

**Implementation**:
- `matchGlob(name: string, pattern: string): boolean` — converts glob to regex and tests
- `expandGlob(pattern: string, dir: string): Promise<string[]>` — lists directory and filters by glob
- `expandPathArgs(args: string[]): Promise<string[]>` — expands glob-containing args against filesystem

**Integration point**: Called in `execSingle()` before dispatching to command methods. Glob-containing arguments (containing `*`, `?`, or `[`) are expanded to matching file paths.
```

### 3. Redirection — New Section

Add a new subsection under "Extension Points":

```markdown
### Input/Output Redirection

Redirection is handled in `execPipeline()` before pipe processing.

**Output redirection**:
- `command > file` — overwrite file with command output
- `command >> file` — append command output to file

**Input redirection**:
- `command < file` — read file content, pass as stdin to command

**Combined**: `command < input > output` — input redirection + output redirection

**Implementation**:
- Checked at the start of `execPipeline()` via regex matching
- Input redirection: reads file via `fs.read()`, passes content to command execution
- Output redirection: writes command output via `fs.write()` after execution
- Append mode: reads existing content, concatenates, writes back

**Error handling**:
- Input file not found: `bash: <filename>: No such file or directory`
- Output write failure: propagated from `fs.write()` error
```

### 4. Environment Variables — New Section

Add a new subsection:

```markdown
### Environment Variables

The shell supports `$VAR` and `${VAR}` substitution in commands.

**Implementation**:
- `private env: Map<string, string>` — stores environment variables
- `setEnv(key: string, value: string): void` — public method to set variables
- `private substituteEnv(cmd: string): string` — replaces `$VAR`/`${VAR}` with values; undefined vars → empty string

**Integration point**: Called at the top of `exec()` before any other processing.
```

### 5. Command Substitution — New Section

```markdown
### Command Substitution

The shell supports `$(command)` substitution.

**Implementation**:
- `private async substituteCommands(cmd: string): Promise<string>`
- Finds `$(...)` patterns via depth-aware parenthesis matching
- Recursively calls `exec()` for each substitution
- Replaces pattern with command output (trimmed)
- Failed commands → empty string spliced in place

**Integration point**: Called after `substituteEnv()` in `exec()`, before redirection/pipe processing.
```

### 6. Future Enhancements — Cleanup

Remove these items from "Potential Improvements" (lines 208-213):
- ~~Exit codes (return `{ output: string; exitCode: number }`)~~ — NOW IMPLEMENTED
- ~~Glob pattern support (*, ?, [])~~ — NOW IMPLEMENTED
- ~~Environment variables ($VAR)~~ — NOW IMPLEMENTED
- ~~Command substitution ($())~~ — NOW IMPLEMENTED
- ~~Redirection (>, >>, <)~~ — NOW IMPLEMENTED
- ~~Background jobs (&)~~ — NOW IMPLEMENTED (if jobs/fg/bg exist in source)
- ~~Job control (fg, bg, jobs)~~ — NOW IMPLEMENTED (if jobs/fg/bg exist in source)

**Keep** items that are still unimplemented:
- Any features in the Future Enhancements list that don't exist in `src/index.ts`

### 7. Refactoring Triggers — Update

Update the refactoring triggers if the file has grown:
- Current file size should be checked; if approaching 1000 lines, update the trigger language

## Editing Approach
- Add new subsections rather than rewriting existing ones
- Preserve existing accurate content
- Only modify lines that are factually incorrect
- Do not delete content that is still relevant

## Dependencies
- None (standalone edit)
- Should be done before or in parallel with task-1775585009931 (VISION.md may reference ARCHITECTURE.md)

## Verification
- Check against DBB criteria in m22/dbb.md (DBB-doc-arch-001 through 008)
- Verify every claim against actual `src/index.ts` implementation
- Run: `grep -c 'Future Enhancements' ARCHITECTURE.md` to confirm section still exists
