# M9 DBB — Command Completeness Round 4

## DBB-m9-001: cp -r recursive directory copy
- Requirement: cp -r support
- Given: directory `/src` with nested files and subdirectories
- When: `cp -r /src /dst`
- Expect: `/dst` exists with identical tree structure and file contents, `/src` unchanged, exit code 0
- Verify: `ls /dst` shows same entries as `ls /src`; files in subdirectories are present

## DBB-m9-002: cp -r on non-existent source
- Requirement: cp -r support
- Given: `/nonexistent` does not exist
- When: `cp -r /nonexistent /dst`
- Expect: error `cp: /nonexistent: No such file or directory`, exit code non-zero

## DBB-m9-003: cp without -r on directory
- Requirement: cp -r support
- Given: `/srcdir` is a directory
- When: `cp /srcdir /dst`
- Expect: error indicating directory requires -r flag, exit code non-zero

## DBB-m9-004: echo output redirection (overwrite)
- Requirement: echo `>` redirection
- Given: `echo foo > /file.txt`
- Expect: `/file.txt` exists with content "foo", exit code 0
- Verify: `cat /file.txt` outputs "foo"

## DBB-m9-005: echo output redirection overwrites existing file
- Requirement: echo `>` redirection
- Given: `/file.txt` exists with content "old"
- When: `echo new > /file.txt`
- Expect: `/file.txt` content is "new" (old content replaced), exit code 0

## DBB-m9-006: echo append redirection
- Requirement: echo `>>` redirection
- Given: `/file.txt` exists with content "line1"
- When: `echo line2 >> /file.txt`
- Expect: `/file.txt` content is "line1\nline2", exit code 0

## DBB-m9-007: echo append to non-existent file
- Requirement: echo `>>` redirection
- Given: `/newfile.txt` does not exist
- When: `echo hello >> /newfile.txt`
- Expect: `/newfile.txt` created with content "hello", exit code 0

## DBB-m9-008: echo redirection in readOnly mode
- Requirement: echo `>` / `>>` redirection
- Given: filesystem in readOnly mode
- When: `echo foo > /file.txt`
- Expect: error `Permission denied`, exit code non-zero, no file written

## DBB-m9-009: mv directory support
- Requirement: mv directory support
- Given: directory `/srcdir` with files, `/dstdir` does not exist
- When: `mv /srcdir /dstdir`
- Expect: `/dstdir` exists with all original contents, `/srcdir` no longer exists, exit code 0

## DBB-m9-010: mv directory to existing destination
- Requirement: mv directory support
- Given: `/srcdir` and `/dstdir` both exist
- When: `mv /srcdir /dstdir`
- Expect: `/srcdir` moved into `/dstdir` (i.e. `/dstdir/srcdir` exists) or overwrites, exit code 0, `/srcdir` no longer exists

## DBB-m9-011: mv non-existent directory
- Requirement: mv directory support
- Given: `/nonexistent` does not exist
- When: `mv /nonexistent /dst`
- Expect: error `mv: /nonexistent: No such file or directory`, exit code non-zero

## DBB-m9-012: ls -a shows real dotfiles
- Requirement: ls -a surfaces real dotfiles from filesystem
- Given: directory containing `.hidden`, `.env`, and `visible` files
- When: `ls -a /dir`
- Expect: output includes `.hidden`, `.env`, `visible`, `.`, and `..`
- Verify: `ls /dir` (without -a) does NOT include `.hidden` or `.env`

## DBB-m9-013: ls -a on directory with no dotfiles
- Requirement: ls -a surfaces real dotfiles from filesystem
- Given: directory with only regular files (no dotfiles)
- When: `ls -a /dir`
- Expect: output includes `.` and `..` plus all regular files, exit code 0

## DBB-m9-014: ls without -a does not show dotfiles
- Requirement: ls -a surfaces real dotfiles from filesystem
- Given: directory containing `.hidden` and `visible`
- When: `ls /dir`
- Expect: output contains "visible" but NOT ".hidden"
