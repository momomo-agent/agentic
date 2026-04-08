# Product Requirements Document: AgenticShell

## Overview

AgenticShell is a Unix-like shell that runs on top of an abstract `AgenticFileSystem` interface, enabling command execution in sandboxed environments (browser, Electron, Node.js). It provides a familiar command-line experience with deterministic output suitable for AI agent tool use.

## 1. Core Commands

### 1.1 File Listing — `ls`

**Requirements:**
- List directory contents. Default to current working directory if no path given.
- `-l` flag: long format showing permissions (`drwxr-xr-x` / `-rwxr-xr-x`) and filename.
- `-a` flag: show hidden files (dotfiles), including synthesized `.` and `..` entries.
- `-la` / `-al` combined flag support.
- `--page N` and `--page-size M` flags for pagination (default page size: 20).
- Accept glob patterns (`*`, `?`, `[...]`) in path argument.
- Display directories with trailing `/` in non-long format.
- Error format: `ls: <path>: No such file or directory`

**Status: Implemented.** All flags, glob support, and pagination are functional.

### 1.2 Change Directory — `cd`

**Requirements:**
- Change current working directory. `cd` or `cd ~` resets to `/`.
- Support relative and absolute paths.
- Reject paths that resolve to regular files (not directories).
- Update `PWD` environment variable on success.
- Error formats: `cd: <path>: No such file or directory`, `cd: <path>: Not a directory`

**Status: Implemented.**

### 1.3 Print Working Directory — `pwd`

**Requirements:**
- Return the current working directory string.

**Status: Implemented.**

### 1.4 File Concatenation — `cat`

**Requirements:**
- Concatenate and output one or more files.
- Support glob patterns in file path arguments.
- Error formats: `cat: missing operand`, `cat: <path>: No such file or directory`

**Status: Implemented.**

### 1.5 Pattern Search — `grep`

**Requirements:**
- Search for regex patterns in files or stdin.
- `-i` flag: case-insensitive matching.
- `-c` flag: output match count only.
- `-l` flag: output filenames with matches only.
- `-r` / `-R` flag: recursive search through directories.
- Combined flag support (e.g., `-icr`).
- Support glob patterns in file path arguments.
- Streaming mode for large single files (via `fs.readStream()`).
- Pipe support: receive stdin and filter lines.
- Error formats: `grep: missing pattern`, `grep: <pattern>: Invalid regular expression`, `grep: <path>: No such file or directory`

**Status: Implemented.** Streaming limited to single non-recursive file. Case-insensitive with multi-file/recursive uses manual file iteration bypass.

### 1.6 File Search — `find`

**Requirements:**
- Recursively search directories for files matching criteria.
- `-name <pattern>` flag: filename glob filter.
- `-type f|d` flag: filter by file type (file or directory).
- Default search path: current working directory.
- Cycle-safe traversal with visited set.
- Silent skip on inaccessible paths.

**Status: Implemented.**

### 1.7 Echo — `echo`

**Requirements:**
- Output arguments joined with spaces.
- Support environment variable substitution in arguments.
- Support command substitution in arguments.

**Status: Implemented.**

### 1.8 Create Directory — `mkdir`

**Requirements:**
- Create directories.
- `-p` flag: create parent directories as needed.
- Without `-p`: verify parent exists first.
- Error formats: `mkdir: <path>: No such file or directory`, `mkdir: <path>: File exists`
- Fallback: if `fs.mkdir` not available, create `.keep` file as workaround.

**Status: Implemented.**

### 1.9 Remove — `rm`

**Requirements:**
- Remove files and directories.
- `-r` / `-rf` flag: recursive deletion.
- Without `-r`: refuse to delete directories (`rm: <path>: is a directory`).
- Safety guard: refuse to delete root path `/`.
- Support glob patterns in path arguments.
- Error format: `rm: missing operand`

**Status: Implemented.** Recursive deletion uses depth-first approach.

### 1.10 Move — `mv`

**Requirements:**
- Move/rename files and directories.
- For directories: recursive copy then recursive delete.
- For files: read source, write destination, delete source.
- Error format: `mv: missing operand`

**Status: Implemented.**

### 1.11 Copy — `cp`

**Requirements:**
- Copy files and directories.
- `-r` / `-R` flag: recursive copy for directories.
- Without `-r`: refuse to copy directories (`cp: <path>: -r not specified; omitting directory`).
- Support glob patterns in source path argument.
- Error format: `cp: missing operand`

**Status: Implemented.**

### 1.12 Touch — `touch`

**Requirements:**
- Create empty file if it does not exist.
- If file already exists, do nothing (idempotent).
- Error format: `touch: missing operand`

**Status: Implemented.**

### 1.13 Head — `head`

**Requirements:**
- Output first N lines of a file.
- `-n N` flag: number of lines (default: 10).
- Error format: `head: missing operand`

**Status: Implemented.**

### 1.14 Tail — `tail`

**Requirements:**
- Output last N lines of a file.
- `-n N` flag: number of lines (default: 10).
- Error format: `tail: missing operand`

**Status: Implemented.**

### 1.15 Word Count — `wc`

**Requirements:**
- Count lines, words, and characters in files or stdin.
- `-l` flag: line count only.
- `-w` flag: word count only.
- `-c` flag: character count only.
- File output format: `<count>\t<path>`
- Stdin output format: `<count>` (single number)
- Default (no flags): `<lines>\t<words>\t<chars>\t<path>`

**Status: Implemented.**

### 1.16 Export — `export`

**Requirements:**
- Set environment variables using `VAR=value` syntax.

**Status: Implemented.** Limited to `VAR=value` form only.

### 1.17 Background Jobs — `jobs`, `fg`, `bg`

**Requirements:**
- `jobs`: list background jobs with format `[<id>] <status> <command>`. Status: `running`, `stopped`, or `done`.
- `fg [id]`: bring background job to foreground. Default: most recent job.
- `bg [id]`: resume background job.
- Error formats: `fg: <id>: no such job`, `bg: <id>: no such job`

**Status: Implemented.**

## 2. Shell Features

### 2.1 Piping (`|`)

**Requirements:**
- Chain commands: output of one becomes stdin of the next.
- Pipe delimiter: ` | ` (space-pipe-space).
- Exit code from last command in pipeline.
- Special handling: `grep` and `wc` support stdin input.

**Status: Implemented.**

### 2.2 Output Redirection (`>`, `>>`)

**Requirements:**
- `command > file`: write command output to file (overwrite).
- `command >> file`: append command output to file.
- Append trailing newline to output.
- Check `readOnly` FS flag before writing.

**Status: Implemented.**

### 2.3 Input Redirection (`<`)

**Requirements:**
- `command < file`: read file content as stdin to command.
- Combinable with output redirection: `command < input > output`.

**Status: Implemented.**

### 2.4 Environment Variable Substitution (`$VAR`, `${VAR}`)

**Requirements:**
- Substitute `$VAR` and `${VAR}` with environment variable values.
- Undefined variables substitute to empty string.
- Applied to all command arguments before execution.

**Status: Implemented.**

### 2.5 Command Substitution (`$(cmd)`, `` `cmd` ``)

**Requirements:**
- Execute inner command and substitute with its output.
- Support `$(command)` syntax with nested parenthesis matching.
- Support backtick syntax `` `command` ``.
- Maximum nesting depth: 3 levels.
- Trim whitespace from substituted output.
- Non-zero exit from inner command produces empty string.

**Status: Implemented.**

### 2.6 Background Execution (`&`)

**Requirements:**
- Append `&` to run command in background.
- Return job ID in format `[<id>] <id>`.
- Track job status in internal map.

**Status: Implemented.**

### 2.7 Glob Pattern Support

**Requirements:**
- `*` — match any characters in filename.
- `?` — match single character.
- `[...]` — character class matching.
- `[!...]` — negated character class.
- Applied to path arguments in: `ls`, `cat`, `grep`, `rm`, `cp`.
- Only match files (not directories).
- Unmatched glob: return `<cmd>: <pattern>: No such file or directory`.

**Status: Implemented.** Supports single-directory and recursive (`**`) glob patterns via `expandGlob()` and `expandRecursiveGlob()`.

### 2.8 Argument Parsing / Quoting

**Requirements:**
- Single quotes (`'`) and double quotes (`"`) for grouping arguments with spaces.

**Status: Implemented.** No escape sequences or nested quoting.

### 2.9 Path Resolution

**Requirements:**
- Convert relative paths to absolute based on `cwd`.
- Normalize `.` and `..` path segments.

**Status: Implemented.**

### 2.10 Read-Only Filesystem Guard

**Requirements:**
- When `fs.readOnly === true`, block all write operations.
- Affected commands: `mkdir`, `rm`, `mv`, `cp`, `touch`, `>`, `>>`.
- Error format: `Permission denied`

**Status: Implemented.**

### 2.11 Environment Variable Assignment

**Requirements:**
- Bare `VAR=value` at pipeline level sets environment variable directly.

**Status: Implemented.**

## 3. Exit Codes

**Requirements:**
- Exit code **0**: successful execution.
- Exit code **1**: file/path-level errors (format: `<cmd>: <path>: <message>`).
- Exit code **2**: command not found, missing operand, missing pattern, invalid regex.
- Unknown commands: `<cmd>: command not found` with exit code 2.

**Status: Implemented.**

## 4. Error Handling

**Requirements:**
- All errors follow UNIX-standard format: `<cmd>: <context>: <message>`.
- Consistent error messages across all commands.
- Read-only FS checks before any write operation.

**Status: Implemented.**

## 5. Quality & Verification

### 5.1 Recursive Glob (`**/*.ts`)

**Requirement:** Extend glob support to handle recursive `**` patterns that match across subdirectory boundaries.

**Status: Implemented.** `expandGlob()` supports `**` recursive patterns via `expandRecursiveGlob()`. Moved from this section to §2.7.

### 5.2 Cross-Environment Consistency Tests

**Requirement:** Automated test suite verifying identical shell behavior across browser, Electron, and Node.js runtimes.

**Status: Implemented.** Mock-based consistency tests exist in `index.test.ts` with `node-backend` and `browser-backend` test suites. Real Node.js filesystem integration tests exist in `test/node-fs-integration.test.ts` with 21 passing tests using real `fs` operations against temp directories. Browser/Electron runtime tests remain with mock backends.

### 5.3 Performance Benchmarks

**Requirement:** Automated performance tests for `grep`, `find`, and `ls` operations on large file sets.

**Status: Partially implemented.** Benchmark test cases exist for grep <500ms (1MB), find <1s (1000 files), ls pagination <100ms. These pass with mock FS but no real filesystem benchmarks are configured.

### 5.4 Test Coverage Quality Gate

**Requirement:** Minimum 80% statement coverage and 75% branch coverage, measured and enforced.

**Status: Implemented.** Coverage thresholds (≥80% statement / ≥75% branch) are configured in `vitest.config.ts` and enforced during test runs.

### 5.5 grep Streaming Consistency

**Requirement:** `grep` streaming mode (`readStream`) should work consistently for recursive and multi-file operations, not just single non-recursive files.

**Status: Partially implemented.** Streaming only available for single non-recursive file. Recursive and multi-file paths bypass streaming and fall back to `fs.read()`.
