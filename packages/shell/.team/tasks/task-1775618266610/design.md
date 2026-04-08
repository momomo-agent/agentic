# Technical Design — task-1775618266610: Update ARCHITECTURE.md

## Overview
ARCHITECTURE.md has 7 discrepancies vs the actual implementation in `src/index.ts` (~971 lines). This task updates the documentation to reflect reality, unblocking task-1775614258494 (architecture gap re-run).

## File to Modify
- `/Users/kenefe/LOCAL/momo-agent/projects/agentic-shell/ARCHITECTURE.md`

## Discrepancies & Required Changes

### 1. Line count update (Line 9)
- **Current**: States "~400 lines"
- **Actual**: `wc -l src/index.ts` reports ~971 lines
- **Action**: Update to "~970 lines" and trigger the "refactoring trigger" note (file > 1000 lines threshold approaching)

### 2. Exit codes documented as "not implemented" (Line 147)
- **Current**: "Exit codes: not currently implemented (all commands return strings)"
- **Actual**: `exec()` returns `Promise<{ output: string; exitCode: number }>`. Exit codes are determined by `exitCodeFor()` which checks for error patterns (command not found → 2, missing operand → 2, error format → 1, else → 0). Pipe segments propagate exit codes.
- **Action**: Replace with documentation of the exit code system:
  ```
  Exit codes: exec() returns { output, exitCode }. exitCodeFor() derives codes:
  - 0: success
  - 1: command error (matches `<cmd>: <target>: <reason>` pattern)
  - 2: command not found or missing operand/invalid regex
  Pipes: first segment error empties stdin; final exit code from last segment.
  ```

### 3. Glob support listed as "Future Enhancement" (Lines 208-209)
- **Current**: "Glob pattern support (*, ?, [])" listed under Future Enhancements
- **Actual**: `matchGlob()`, `expandGlob()`, `expandRecursiveGlob()`, `expandPathArgs()` are all implemented. Supports `*`, `?`, `[abc]`, `[!abc]`, and `**` recursive patterns.
- **Action**: Move to a new "Implemented Features" subsection or integrate into existing sections:
  - Add to "Path Resolution" section: glob expansion happens automatically via `expandPathArgs()` before command execution
  - Document `matchGlob(name, pattern)` converts glob to regex
  - Document `expandGlob(pattern, dir)` expands single-dir patterns
  - Document `expandRecursiveGlob(baseDir, pattern)` handles `**`
  - Remove from Future Enhancements

### 4. Environment variables listed as "Future Enhancement" (Line 209)
- **Current**: "Environment variables ($VAR)" listed under Future Enhancements
- **Actual**: `substituteEnv()` replaces `$VAR` and `${VAR}` before execution. `setEnv()`/`getEnv()` exposed. Default env: HOME=/, PWD=/, PATH=/usr/bin:/bin. `export VAR=value` and `VAR=value` assignment both work.
- **Action**: Document under a new section or add to "Command Pattern":
  ```
  ### Environment Variables
  - substitution: $VAR and ${VAR} expanded before command execution
  - assignment: VAR=value and export VAR=value both supported
  - defaults: HOME=/, PWD=/, PATH=/usr/bin:/bin
  ```
  - Remove from Future Enhancements

### 5. Command substitution listed as "Future Enhancement" (Line 210)
- **Current**: "Command substitution ($(cmd))" listed under Future Enhancements
- **Actual**: `substituteCommands()` handles both `$(cmd)` and backtick `` `cmd` `` substitution with nesting depth limit (max 3). Non-zero exit codes produce empty string.
- **Action**: Document under command execution pipeline:
  ```
  ### Command Substitution
  - $(cmd) and `cmd` syntax supported
  - max nesting depth: 3
  - non-zero exit → empty string
  ```
  - Remove from Future Enhancements

### 6. Redirection listed as "Future Enhancement" (Lines 211-212)
- **Current**: "Redirection (>, >>, <)" listed under Future Enhancements
- **Actual**: `execPipeline()` handles `>` (write), `>>` (append), and `<` (input) redirection via regex matching. Input redirection can be combined with output redirection: `cmd < file > out`.
- **Action**: Document in existing or new section:
  ```
  ### Redirection
  - output: `cmd > file` overwrites, `cmd >> file` appends
  - input: `cmd < file` reads file as stdin, passes to execWithStdin()
  - combined: `cmd < in > out` and `cmd < in >> out` supported
  ```
  - Remove from Future Enhancements

### 7. Background jobs listed as "Future Enhancement" (Line 213)
- **Current**: "Background jobs (&, fg, bg, jobs)" listed under Future Enhancements
- **Actual**: `exec()` detects trailing `&`, runs command async via `execPipeline()`, stores in `this.jobs` Map. `jobs`, `fg`, `bg` commands implemented.
- **Action**: Document under command list or new section:
  ```
  ### Background Jobs
  - cmd & runs in background, returns [jobId] jobId
  - jobs lists running/stopped/done jobs
  - fg [id] waits for job result
  - bg [id] (stub, no-op in current implementation)
  ```
  - Remove from Future Enhancements

### 8. Remove trailing auto-merged CR text (Lines 221-229)
- **Current**: Lines 221-229 contain auto-appended CR description text
- **Action**: Delete lines 221-229 (everything after the "Future Enhancements" section)

## Execution Steps
1. Read current ARCHITECTURE.md
2. Apply changes 1-7 in a single edit pass, modifying sections top-to-bottom
3. Clean up trailing CR text (change 8)
4. Verify no other discrepancies remain by reviewing the command list in `execSingle()` switch (lines 232-258)

## Edge Cases
- Some features may overlap (e.g., glob is used by grep, cp, cat). Document glob as a cross-cutting concern in Path Resolution rather than per-command.
- The "Future Enhancements" section should still list genuinely unimplemented features (e.g., job control refinements, signal handling).

## Dependencies
- None — this is a documentation-only change
- Unblocks: task-1775614258494 (Verify architecture alignment score)

## Verification
- After edit, re-run architecture gap analysis to confirm match > 85%
- Diff old vs new ARCHITECTURE.md to ensure no regressions
