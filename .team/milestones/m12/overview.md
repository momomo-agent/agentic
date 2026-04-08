# Milestone 12 — Exit Codes & Input Redirection

## Goals
Address the two remaining P0 architecture gaps that affect shell correctness.

## Scope

### 1. Exit Codes (P0)
Commands currently return `string`. The architecture gap requires returning `{ output: string; exitCode: number }` so callers can distinguish success from failure.

**Acceptance criteria:**
- `exec()` returns `{ output: string; exitCode: number }`
- Exit code 0 = success, 1 = general error, 2 = misuse
- All existing tests updated to use `.output`
- New tests assert non-zero exit codes on errors

### 2. Input Redirection `<` (P0)
`exec()` handles `>` and `>>` but not `<`. Commands like `grep pattern < file.txt` should work.

**Acceptance criteria:**
- `exec()` parses `< filename` and reads file content as stdin
- Stdin-aware commands (grep) receive it correctly
- Error if redirect file does not exist

### 3. Glob pattern support in ls/grep (P1)
Glob (`*`, `?`) currently only works in `find -name`. Extend to `ls` and `grep`.

**Acceptance criteria:**
- `ls *.ts` lists matching files in cwd
- `grep pattern *.ts` searches matching files

## Out of Scope
- Environment variables (`$VAR`)
- Command substitution (`$(cmd)`)
- Background jobs (`&`)
