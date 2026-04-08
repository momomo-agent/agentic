# M12 DBB — Exit Codes, Input Redirection & Glob Expansion

## Exit Codes

### DBB-m12-001: Success returns exit code 0
- Requirement: exec() returns `{ output: string; exitCode: number }`
- Given: any command that succeeds (e.g. `ls /`, `cat /file.txt`)
- Expect: result.exitCode === 0, result.output contains expected content

### DBB-m12-002: Error returns non-zero exit code
- Requirement: exit code 1 = general error
- Given: `cat /nonexistent`
- Expect: result.exitCode === 1, result.output contains error message

### DBB-m12-003: Misuse returns exit code 2
- Requirement: exit code 2 = misuse (wrong usage/args)
- Given: command invoked with invalid flags or missing required args (e.g. `grep` with no pattern)
- Expect: result.exitCode === 2

### DBB-m12-004: Pipe exit code reflects last failing stage
- Requirement: pipe chains propagate exit codes
- Given: `cat /nonexistent | grep pattern`
- Expect: overall exit code is non-zero

### DBB-m12-005: Output field always present
- Requirement: exec() always returns `{ output, exitCode }`
- Given: any command (success or failure)
- Expect: result.output is a string (never undefined/null), result.exitCode is a number

---

## Input Redirection (`<`)

### DBB-m12-006: grep with input redirection
- Requirement: `exec()` parses `< filename` and feeds file content as stdin
- Given: file `/data.txt` contains "hello\nworld"; run `grep hello < /data.txt`
- Expect: output is "hello", exit code 0

### DBB-m12-007: Input redirection file not found
- Requirement: error if redirect file does not exist
- Given: `grep pattern < /nonexistent.txt`
- Expect: error message contains path and reason (e.g. "No such file or directory"), exit code non-zero

### DBB-m12-008: Input redirection with no match
- Requirement: stdin-aware commands receive redirected content correctly
- Given: file `/data.txt` contains "hello"; run `grep xyz < /data.txt`
- Expect: empty output, exit code 1

### DBB-m12-009: Input redirection combined with output redirection
- Requirement: `<` and `>` can coexist in same command
- Given: `grep hello < /input.txt > /output.txt`
- Expect: `/output.txt` contains matching lines, exit code 0

---

## Glob Expansion

### DBB-m12-010: ls with glob pattern
- Requirement: `ls *.ts` lists matching files in cwd
- Given: cwd contains `a.ts`, `b.ts`, `c.js`
- When: `ls *.ts`
- Expect: output includes `a.ts` and `b.ts`, does not include `c.js`, exit code 0

### DBB-m12-011: ls glob no matches
- Requirement: glob expansion in ls
- Given: cwd contains no `.ts` files
- When: `ls *.ts`
- Expect: error or empty output indicating no match, exit code non-zero

### DBB-m12-012: grep with glob pattern
- Requirement: `grep pattern *.ts` searches matching files
- Given: cwd contains `a.ts` (has "hello"), `b.ts` (no match), `c.js` (has "hello")
- When: `grep hello *.ts`
- Expect: output includes match from `a.ts`, does not include `c.js`, exit code 0

### DBB-m12-013: grep glob no matching files
- Requirement: glob expansion in grep
- Given: cwd has no `.ts` files
- When: `grep pattern *.ts`
- Expect: error or empty output, exit code non-zero

### DBB-m12-014: glob `?` wildcard in ls
- Requirement: `?` matches single character
- Given: cwd contains `a1.ts`, `a2.ts`, `ab.ts`
- When: `ls a?.ts`
- Expect: all three returned (each has exactly one char after `a`), exit code 0
