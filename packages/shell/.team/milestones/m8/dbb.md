# M8 DBB — Command Completeness & Documentation

## DBB-m8-001: cp -r copies directory recursively
- Requirement: cp -r recursive directory copy (overview.md)
- Given: directory `/src` with nested files and subdirectories (e.g., `/src/a.txt`, `/src/sub/b.txt`)
- When: `cp -r /src /dst`
- Expect: `/dst` exists with identical structure to `/src`, all files copied, exit code 0
- Verify: `ls /dst` and `cat /dst/sub/b.txt` return correct content

## DBB-m8-002: cp -r on non-existent source
- Requirement: cp -r error handling
- Given: `/nonexistent` does not exist
- When: `cp -r /nonexistent /dst`
- Expect: error `cp: /nonexistent: No such file or directory`, exit code non-zero, `/dst` not created

## DBB-m8-003: cp -r deeply nested directory
- Requirement: cp -r boundary case
- Given: directory tree 10+ levels deep with files at each level
- When: `cp -r /deep /deep-copy`
- Expect: entire tree copied, exit code 0, no stack overflow
- Verify: `find /deep-copy` returns all entries from original tree

## DBB-m8-004: echo > overwrites file
- Requirement: echo redirection `>` operator (overview.md)
- Given: file `/file.txt` exists with content "old"
- When: `echo "new" > /file.txt`
- Expect: `/file.txt` contains "new" (old content replaced), exit code 0

## DBB-m8-005: echo > creates new file
- Requirement: echo redirection `>` operator
- Given: `/newfile.txt` does not exist
- When: `echo "hello" > /newfile.txt`
- Expect: `/newfile.txt` created with content "hello", exit code 0

## DBB-m8-006: echo >> appends to file
- Requirement: echo redirection `>>` operator (overview.md)
- Given: file `/file.txt` with content "line1"
- When: `echo "line2" >> /file.txt`
- Expect: `/file.txt` contains "line1\nline2", exit code 0

## DBB-m8-007: echo >> creates file if missing
- Requirement: echo redirection `>>` operator
- Given: `/newfile.txt` does not exist
- When: `echo "hello" >> /newfile.txt`
- Expect: `/newfile.txt` created with content "hello", exit code 0

## DBB-m8-008: echo > in readOnly mode
- Requirement: echo redirection permission handling
- Given: filesystem in readOnly mode
- When: `echo "test" > /file.txt`
- Expect: error `echo: /file.txt: Permission denied`, exit code non-zero

## DBB-m8-009: mv directory to new location
- Requirement: mv directory support (overview.md)
- Given: directory `/src` with files (e.g., `/src/a.txt`)
- When: `mv /src /dst`
- Expect: `/dst` exists with all files from `/src`, `/src` deleted, exit code 0
- Verify: `ls /dst` shows original files, `ls /src` fails with "No such file or directory"

## DBB-m8-010: mv rename directory
- Requirement: mv directory support
- Given: directory `/oldname` exists
- When: `mv /oldname /newname`
- Expect: `/newname` exists with original content, `/oldname` deleted, exit code 0

## DBB-m8-011: mv directory to existing directory
- Requirement: mv directory overwrite behavior
- Given: both `/src` and `/dst` exist as directories
- When: `mv /src /dst`
- Expect: `/dst` replaced with `/src` content, `/src` deleted, exit code 0

## DBB-m8-012: mv non-existent directory
- Requirement: mv directory error handling
- Given: `/nonexistent` does not exist
- When: `mv /nonexistent /dst`
- Expect: error `mv: /nonexistent: No such file or directory`, exit code non-zero

## DBB-m8-013: ls -a shows dotfiles
- Requirement: ls -a dotfiles (overview.md)
- Given: directory with files `.hidden`, `.config`, and `visible.txt`
- When: `ls -a /dir`
- Expect: output includes `.hidden`, `.config`, `.`, `..`, and `visible.txt`, exit code 0

## DBB-m8-014: ls without -a hides dotfiles
- Requirement: ls -a dotfiles
- Given: directory with `.hidden` and `visible.txt`
- When: `ls /dir` (without -a flag)
- Expect: output includes `visible.txt` but NOT `.hidden`, exit code 0
- Verify: `.` and `..` also excluded

## DBB-m8-015: ls -a includes . and ..
- Requirement: ls -a dotfiles (EXPECTED_DBB.md DBB-ls-002)
- Given: any directory
- When: `ls -a /dir`
- Expect: output includes `.` and `..` entries

## DBB-m8-016: Pagination test coverage
- Requirement: Explicit pagination/streaming unit tests (overview.md)
- Given: test suite execution
- Expect: dedicated test cases exist for `--page` and `--page-size` flags
- Verify: tests cover page 1, page 2, last page, and out-of-bounds page scenarios
- Verify: test names explicitly mention "pagination" or "page"

## DBB-m8-017: Streaming test coverage
- Requirement: Explicit pagination/streaming unit tests (overview.md)
- Given: test suite execution
- Expect: dedicated test cases exist for `grepStream()` or streaming interfaces
- Verify: tests cover streaming with matches, no matches, and large files
- Verify: test names explicitly mention "stream" or "streaming"

## DBB-m8-018: ARCHITECTURE.md exists
- Requirement: ARCHITECTURE.md documentation (overview.md)
- Given: repository root directory
- When: check for `/ARCHITECTURE.md`
- Expect: file exists at repo root

## DBB-m8-019: ARCHITECTURE.md documents design decisions
- Requirement: ARCHITECTURE.md documentation (overview.md)
- Given: `/ARCHITECTURE.md` file
- Expect: document contains sections on:
  - File system abstraction design
  - Command execution architecture
  - Pipe implementation approach
  - Path resolution strategy
  - Permission model
- Verify: each section explains the "why" behind design choices, not just "what"

## DBB-m8-020: ARCHITECTURE.md is readable
- Requirement: ARCHITECTURE.md documentation quality
- Given: `/ARCHITECTURE.md` file
- Expect: document uses clear headings, examples, and diagrams where appropriate
- Verify: a new developer can understand core design decisions from reading it
