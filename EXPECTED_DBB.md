# Done-By-Definition (DBB) — Agentic Shell

This document defines the acceptance criteria for all shell commands. Every feature must meet its DBB before being considered complete.

## Quality Gates

### Test Coverage
- Overall statement coverage ≥ 80%
- Branch coverage ≥ 75%
- Every command has at least 3 test cases (happy path, error case, boundary case)
- All 148+ tests pass with 0 failures
- No skipped tests or test errors

### Performance
- Command execution < 100ms for single file operations
- grep on 1MB file completes in < 500ms
- find on 1000+ file tree completes in < 1s
- rm -r on deeply nested directories (10+ levels) completes without stack overflow

### Error Handling
- All errors follow UNIX format: `<command>: <path>: <reason>`
- Non-zero exit codes for all error conditions
- No uncaught exceptions or crashes
- Error messages contain path and reason for all failures

## Command DBBs

### ls — List Directory

**DBB-ls-001**: ls -a shows hidden files
- Given: a directory containing `.hidden` and `visible` files
- Expect: `ls -a <dir>` output includes `.hidden`; `ls <dir>` (without -a) does not include `.hidden`

**DBB-ls-002**: ls -a includes . and ..
- Given: any directory
- Expect: `ls -a` output includes `.` and `..` entries

**DBB-ls-003**: ls paginates large directory
- Given: directory with >pageSize entries; run `ls --page 1 --page-size 10 <dir>`
- Expect: exactly 10 entries returned, exit code 0

**DBB-ls-004**: ls page 2 returns next slice
- Given: directory with 25 entries; run `ls --page 2 --page-size 10 <dir>`
- Expect: entries 11–20 returned

**DBB-ls-005**: ls last page returns remainder
- Given: 25 entries; `ls --page 3 --page-size 10 <dir>`
- Expect: 5 entries (21–25)

**DBB-ls-006**: ls without pagination is backward-compatible
- Given: `ls <dir>` with no pagination flags
- Expect: all entries returned, same as pre-M3

### cat — Concatenate Files

**DBB-cat-001**: cat reads file content
- Given: file `/file.txt` with content "hello"
- When: `cat /file.txt`
- Expect: output is "hello", exit code 0

**DBB-cat-002**: cat on non-existent file
- Given: `/nonexistent` does not exist
- When: `cat /nonexistent`
- Expect: error `cat: /nonexistent: No such file or directory`, exit code non-zero

**DBB-cat-003**: cat empty file
- Given: empty file `/empty.txt`
- When: `cat /empty.txt`
- Expect: empty output, exit code 0

**DBB-cat-004**: cat multiple files
- Given: files `/a.txt` (content "a") and `/b.txt` (content "b")
- When: `cat /a.txt /b.txt`
- Expect: output is "a\nb", exit code 0

### grep — Pattern Search

**DBB-grep-001**: grep -r recursive search
- Given: a directory tree with files containing a pattern at multiple depths
- Expect: `grep -r <pattern> <dir>` returns all matching lines from all files recursively, exit code 0
- Verify: results include matches from nested subdirectories, not just top-level files

**DBB-grep-002**: grep -r no match
- Given: `grep -r <pattern> <dir>` where no file contains the pattern
- Expect: empty output, exit code 1 (UNIX standard for no match)

**DBB-grep-003**: grep -r on non-existent directory
- Given: `grep -r pattern /nonexistent`
- Expect: exit code non-zero, error message contains path and reason (e.g. "No such file or directory")

**DBB-grep-004**: grep -i case-insensitive
- Given: file with "Hello", "HELLO", "hello"
- When: `grep -i "hello" file`
- Expect: all three lines match
- Verify: `-i` works in combination with `-l`, `-c`, `-r` flags

**DBB-grep-005**: grep -i in pipe stdin mode
- Given: `echo "Hello World" | grep -i "hello"`
- Expect: output is "Hello World", exit code 0

**DBB-grep-006**: grep -i without flag remains case-sensitive
- Given: file with "Hello" and "hello"
- When: `grep "hello" file`
- Expect: only "hello" matches (not "Hello")

**DBB-grep-007**: grep streaming returns correct matches
- Given: file with known matching lines; grep via streaming interface
- Expect: all matching lines returned, identical to non-streaming output

**DBB-grep-008**: grep streaming — no match returns empty
- Given: streaming grep with non-matching pattern
- Expect: empty output

**DBB-grep-009**: grep -i invalid regex
- Given: `grep -i "[invalid" file.txt` (unclosed bracket)
- Expect: error message indicating invalid pattern, exit code non-zero

**DBB-grep-010**: grep -l flag (file list only)
- Given: multiple files with matches
- When: `grep -l pattern /dir/*`
- Expect: only file paths returned (no line content)

**DBB-grep-011**: grep -c flag (count)
- Given: file with 3 matching lines
- When: `grep -c pattern file`
- Expect: output is "3", exit code 0

### find — Search Files

**DBB-find-001**: find recursive directory traversal
- Given: directory tree with nested subdirectories
- When: `find /dir`
- Expect: returns entries from all subdirectories recursively
- Verify: results include full paths (e.g. `/dir/sub/file.txt`)

**DBB-find-002**: find -name matches in nested subdirs
- Given: files matching pattern in nested directories
- When: `find /dir -name "*.ts"`
- Expect: matches files in all subdirectories

**DBB-find-003**: find -type f returns only files
- Given: directory with mixed files and subdirectories
- When: `find /dir -type f`
- Expect: output contains only file entries (no trailing `/`)
- Verify: uses `entry.type` field, not path heuristics

**DBB-find-004**: find -type d returns only directories
- Given: directory with mixed files and subdirectories
- When: `find /dir -type d`
- Expect: output contains only directory entries

**DBB-find-005**: find without -type returns all entries
- Given: directory with mixed entries
- When: `find /dir`
- Expect: all entries returned regardless of type

### pwd — Print Working Directory

**DBB-pwd-001**: pwd returns current directory
- Given: cwd is `/a/b`
- When: `pwd`
- Expect: output is "/a/b", exit code 0

**DBB-pwd-002**: pwd after cd
- Given: `cd /tmp` executed
- When: `pwd`
- Expect: output is "/tmp", exit code 0

### cd — Change Directory

**DBB-cd-001**: cd to valid directory
- Given: `/subdir` exists as a directory
- When: `cd /subdir`
- Expect: cwd updated to `/subdir`, no error

**DBB-cd-002**: cd to non-existent directory
- Given: `/no/such/dir` does not exist
- When: `cd /no/such/dir`
- Expect: error `cd: /no/such/dir: No such file or directory`, cwd unchanged

**DBB-cd-003**: cd to a file (not a directory)
- Given: `/file.txt` is a file
- When: `cd /file.txt`
- Expect: error `cd: /file.txt: Not a directory`, cwd unchanged

### mkdir — Make Directory

**DBB-mkdir-001**: mkdir creates directory natively
- Given: `/newdir` does not exist
- When: `mkdir /newdir`
- Expect: `ls /newdir` succeeds (no .keep workaround visible), exit code 0

**DBB-mkdir-002**: mkdir -p creates nested directories
- Given: `/a/b/c` does not exist
- When: `mkdir -p /a/b/c`
- Expect: all intermediate directories created, exit code 0

**DBB-mkdir-003**: mkdir without -p fails if parent missing
- Given: `/a/b` does not exist
- When: `mkdir /a/b/c`
- Expect: error `mkdir: /a/b/c: No such file or directory`, exit code non-zero

### rm — Remove Files

**DBB-rm-001**: rm correctly deletes files
- Given: file `/file.txt` exists
- When: `rm /file.txt`
- Expect: calls `fs.delete` and file no longer exists, exit code 0

**DBB-rm-002**: rm on non-existent file
- Given: `/nonexistent` does not exist
- When: `rm /nonexistent`
- Expect: error `rm: /nonexistent: No such file or directory`, exit code non-zero

**DBB-rm-003**: rm without -r on directory
- Given: a directory `/tmp/dir`
- When: `rm /tmp/dir`
- Expect: error `rm: /tmp/dir: is a directory`, exit code non-zero

**DBB-rm-004**: rm -r deletes directory recursively
- Given: a directory `/tmp/dir` with nested files
- When: `rm -r /tmp/dir`
- Expect: all files and the directory are deleted, exit code 0

**DBB-rm-005**: rm -r safety — refuses root
- Given: `rm -r /`
- Expect: error message "rm: refusing to remove '/'", no deletion, exit code non-zero

**DBB-rm-006**: rm multi-path
- Given: `rm file1.txt file2.txt file3.txt` where all files exist
- Expect: all files deleted, exit code 0

**DBB-rm-007**: rm -r deep nesting
- Given: directory tree 10+ levels deep with files at each level
- When: `rm -r /deep`
- Expect: entire tree deleted, exit code 0, no stack overflow

### mv — Move Files

**DBB-mv-001**: mv basic move
- Given: file `/src.txt` exists, `/dst.txt` does not exist
- When: `mv /src.txt /dst.txt`
- Expect: `/dst.txt` exists with original content, `/src.txt` deleted, exit code 0

**DBB-mv-002**: mv to existing file (overwrite)
- Given: both `/src.txt` and `/dst.txt` exist
- When: `mv /src.txt /dst.txt`
- Expect: `/dst.txt` has src content, `/src.txt` deleted, exit code 0

**DBB-mv-003**: mv non-existent file
- Given: `/nonexistent.txt` does not exist
- When: `mv /nonexistent.txt /dst.txt`
- Expect: error message `mv: /nonexistent.txt: No such file or directory`, exit code non-zero

### cp — Copy Files

**DBB-cp-001**: cp basic copy
- Given: file `/src.txt` exists with content "hello"
- When: `cp /src.txt /dst.txt`
- Expect: both `/src.txt` and `/dst.txt` exist with content "hello", exit code 0

**DBB-cp-002**: cp to existing file (overwrite)
- Given: `/src.txt` (content "new") and `/dst.txt` (content "old") exist
- When: `cp /src.txt /dst.txt`
- Expect: `/dst.txt` has content "new", `/src.txt` unchanged, exit code 0

**DBB-cp-003**: cp non-existent file
- Given: `/nonexistent.txt` does not exist
- When: `cp /nonexistent.txt /dst.txt`
- Expect: error message `cp: /nonexistent.txt: No such file or directory`, exit code non-zero

### echo — Print Text

**DBB-echo-001**: echo prints arguments
- Given: `echo hello world`
- Expect: output is "hello world", exit code 0

**DBB-echo-002**: echo with no arguments
- Given: `echo`
- Expect: output is empty line, exit code 0

**DBB-echo-003**: echo with special characters
- Given: `echo "hello\nworld"`
- Expect: output preserves special characters, exit code 0

### touch — Create Empty File

**DBB-touch-001**: touch creates empty file
- Given: `/newfile.txt` does not exist
- When: `touch /newfile.txt`
- Expect: `/newfile.txt` exists with empty content, exit code 0

**DBB-touch-002**: touch on existing file
- Given: `/file.txt` exists with content "hello"
- When: `touch /file.txt`
- Expect: file still exists with content "hello" (no modification), exit code 0

**DBB-touch-003**: touch in readOnly mode
- Given: filesystem in readOnly mode
- When: `touch /file.txt`
- Expect: error `touch: /file.txt: Permission denied`, exit code non-zero

### head — First N Lines

**DBB-head-001**: head default (10 lines)
- Given: file with 20 lines
- When: `head /file.txt`
- Expect: first 10 lines returned, exit code 0

**DBB-head-002**: head -n 5
- Given: file with 20 lines
- When: `head -n 5 /file.txt`
- Expect: first 5 lines returned, exit code 0

**DBB-head-003**: head on file with fewer lines
- Given: file with 3 lines
- When: `head -n 10 /file.txt`
- Expect: all 3 lines returned, exit code 0

### tail — Last N Lines

**DBB-tail-001**: tail default (10 lines)
- Given: file with 20 lines
- When: `tail /file.txt`
- Expect: last 10 lines returned, exit code 0

**DBB-tail-002**: tail -n 5
- Given: file with 20 lines
- When: `tail -n 5 /file.txt`
- Expect: last 5 lines returned, exit code 0

**DBB-tail-003**: tail on file with fewer lines
- Given: file with 3 lines
- When: `tail -n 10 /file.txt`
- Expect: all 3 lines returned, exit code 0

### wc — Word Count

**DBB-wc-001**: wc counts lines, words, bytes
- Given: file with known line/word/byte count
- When: `wc /file.txt`
- Expect: output format is "<lines> <words> <bytes> <filename>", exit code 0

**DBB-wc-002**: wc -l counts lines only
- Given: file with 10 lines
- When: `wc -l /file.txt`
- Expect: output is "10 /file.txt", exit code 0

**DBB-wc-003**: wc on empty file
- Given: empty file
- When: `wc /empty.txt`
- Expect: output is "0 0 0 /empty.txt", exit code 0

## Pipe Support

**DBB-pipe-001**: cat file | grep pattern
- Given: a file containing lines with and without a pattern; run `cat <file> | grep <pattern>`
- Expect: output contains only matching lines, exit code 0

**DBB-pipe-002**: echo | grep
- Given: `echo "hello world" | grep hello`
- Expect: output is "hello world", exit code 0

**DBB-pipe-003**: left command fails
- Given: `cat /nonexistent | grep pattern`
- Expect: error message from cat propagates, grep does not produce output, exit code non-zero

**DBB-pipe-004**: 3+ stage pipe
- Given: `cat file | grep pattern | grep another | wc`
- Expect: correct output from final stage, exit code 0
- Verify: intermediate outputs correctly piped

## Permission Handling

**DBB-perm-001**: readOnly — write blocked
- Given: filesystem in readOnly mode
- When: `touch /file.txt`
- Expect: error `touch: /file.txt: Permission denied`, exit code non-zero

**DBB-perm-002**: readOnly — all write commands blocked
- Given: filesystem in readOnly mode
- When: each of `write`, `mkdir`, `rm`, `mv`, `cp`, `touch`
- Expect: each returns `Permission denied` error

**DBB-perm-003**: readOnly — read commands unaffected
- Given: filesystem in readOnly mode
- When: `cat /file.txt`, `ls /`, `grep pattern /file.txt`
- Expect: normal output, no permission error

## Path Resolution

**DBB-path-001**: resolve ../ from subdirectory
- Given: cwd is `/a/b`
- When: `resolve('../foo')`
- Expect: returns `/a/foo`

**DBB-path-002**: resolve ../../ from nested directory
- Given: cwd is `/a/b/c`
- When: `resolve('../../foo')`
- Expect: returns `/a/foo`

**DBB-path-003**: resolve does not escape root
- Given: cwd is `/a`
- When: `resolve('../../..')`
- Expect: returns `/`

**DBB-path-004**: resolve with ./ and ../
- Given: cwd is `/cwd`
- When: `resolve('a/../b')`
- Expect: returns `/cwd/b`

**DBB-path-005**: path resolution in cat
- Given: `file.txt` exists at root, cwd is `/subdir`
- When: `cat ../file.txt`
- Expect: file contents returned correctly, exit code 0

## Boundary Cases

**DBB-boundary-001**: empty file
- Given: empty file `/empty.txt`
- When: `cat /empty.txt`
- Expect: empty output, exit code 0

**DBB-boundary-002**: special characters in filename
- Given: a file named `hello world.txt` (space in name)
- When: `cat "hello world.txt"`
- Expect: file contents returned correctly, exit code 0

**DBB-boundary-003**: deeply nested directory structure
- Given: directory tree 10+ levels deep
- When: `find /deep` or `rm -r /deep`
- Expect: operation completes without stack overflow, exit code 0

**DBB-boundary-004**: large file streaming
- Given: file > 1MB
- When: `grep pattern /large.txt`
- Expect: completes in < 500ms using streaming, correct matches returned

**DBB-boundary-005**: large directory pagination
- Given: directory with 1000+ entries
- When: `ls --page 1 --page-size 100 /large-dir`
- Expect: exactly 100 entries returned, completes in < 100ms

## Cross-Environment Consistency

**DBB-env-001**: browser/Electron/Node consistency
- Given: same test suite run in browser, Electron, and Node.js environments
- Expect: all tests pass in all three environments
- Verify: fs backend differences abstracted by AgenticFileSystem interface

**DBB-env-002**: path resolution consistency
- Given: path resolution tests with `.`, `..`, `/`
- Expect: identical behavior across all environments

**DBB-env-003**: error format consistency
- Given: error-triggering commands (file not found, permission denied)
- Expect: identical error message format across all environments


Create EXPECTED_DBB.md documenting: (1) Test coverage requirements (unit tests for all commands, edge cases, cross-backend tests), (2) Performance benchmarks (ls pagination threshold, grep streaming threshold), (3) Error message format standards (UNIX-compliant), (4) Permission handling requirements, (5) Quality gate criteria for milestone completion