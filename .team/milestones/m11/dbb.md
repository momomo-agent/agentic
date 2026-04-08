# M11 DBB — Command Completeness Round 5 & ARCHITECTURE.md

## DBB-m11-001: cp -r copies directory tree
- Requirement: task-1775567275854
- Given: directory `/src` with files `/src/a.txt` and `/src/sub/b.txt`
- When: `cp -r /src /dst`
- Expect: `/dst/a.txt` and `/dst/sub/b.txt` exist with original content, `/src` unchanged, exit code 0

## DBB-m11-002: cp -r destination already exists
- Requirement: task-1775567275854
- Given: `/src` directory and `/dst` directory already exist
- When: `cp -r /src /dst`
- Expect: contents merged or overwritten, exit code 0

## DBB-m11-003: cp -r on non-existent source
- Requirement: task-1775567275854
- Given: `/nosuchdir` does not exist
- When: `cp -r /nosuchdir /dst`
- Expect: error `cp: /nosuchdir: No such file or directory`, exit code non-zero

## DBB-m11-004: cp without -r on directory fails
- Requirement: task-1775567275854
- Given: `/srcdir` is a directory
- When: `cp /srcdir /dst`
- Expect: error indicating directory requires `-r` flag, exit code non-zero

## DBB-m11-005: mv moves a directory
- Requirement: task-1775567285755
- Given: directory `/srcdir` with files inside, `/dstdir` does not exist
- When: `mv /srcdir /dstdir`
- Expect: `/dstdir` exists with all original contents, `/srcdir` no longer exists, exit code 0

## DBB-m11-006: mv directory to existing destination
- Requirement: task-1775567285755
- Given: `/srcdir` and `/dstdir` both exist
- When: `mv /srcdir /dstdir`
- Expect: `/srcdir` moved into `/dstdir/srcdir` or overwrites, exit code 0, `/srcdir` no longer exists at original path

## DBB-m11-007: mv directory non-existent source
- Requirement: task-1775567285755
- Given: `/nosuchdir` does not exist
- When: `mv /nosuchdir /dst`
- Expect: error `mv: /nosuchdir: No such file or directory`, exit code non-zero

## DBB-m11-008: echo > creates/overwrites file
- Requirement: task-1775567285818
- Given: `file.txt` does not exist (or exists with content "old")
- When: `echo hello > file.txt`
- Expect: `file.txt` contains "hello", exit code 0
- Verify: `cat file.txt` outputs "hello"

## DBB-m11-009: echo >> appends to file
- Requirement: task-1775567285818
- Given: `file.txt` exists with content "line1"
- When: `echo line2 >> file.txt`
- Expect: `file.txt` contains "line1\nline2", exit code 0

## DBB-m11-010: echo >> creates file if not exists
- Requirement: task-1775567285818
- Given: `newfile.txt` does not exist
- When: `echo hello >> newfile.txt`
- Expect: `newfile.txt` created with content "hello", exit code 0

## DBB-m11-011: echo > in readOnly mode fails
- Requirement: task-1775567285818
- Given: filesystem in readOnly mode
- When: `echo hello > file.txt`
- Expect: error `Permission denied`, exit code non-zero, file not created

## DBB-m11-012: ARCHITECTURE.md exists at repo root
- Requirement: task-1775567285874
- Given: repo root
- When: `ls /` or `cat /ARCHITECTURE.md`
- Expect: `ARCHITECTURE.md` file exists, is non-empty, exit code 0

## DBB-m11-013: ARCHITECTURE.md covers required topics
- Requirement: task-1775567285874
- Given: `cat /ARCHITECTURE.md`
- Expect: document contains sections covering: command pattern, pipe support, path resolution, AgenticFileSystem interface
- Verify: each topic is human-readable prose (not placeholder text)
