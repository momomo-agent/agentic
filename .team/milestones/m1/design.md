# M1 Technical Design — Foundation & Quality Gate

## Overview

All changes are in `src/index.ts` (single-file architecture). No new files needed except test file.

## 1. grep -r recursive search

Extend `grep()` to detect `-r` flag. When present, call `this.fs.grep(pattern)` (which already searches all files) and filter results to paths under the given directory. No recursive traversal needed — the fs backend handles it.

## 2. Pipe support

In `exec()`, detect `|` in the command string before `parseArgs`. Split on `|`, execute left command, inject its stdout as stdin for the right command. Only `cmd | grep pattern` and `cmd | cmd` patterns needed for M1.

Implementation: split command on ` | `, run left side, pass result as a synthetic file or inline string to right side.

## 3. Test suite

New file: `src/index.test.ts` using vitest. Mock `AgenticFileSystem`. Cover all 15 commands + boundary cases. Target ≥80% coverage.

## 4. Error handling standardization

All commands must return errors in format: `<cmd>: <path>: No such file or directory` (to stderr-equivalent string). Audit each command and normalize error returns.

## 5. ls -a hidden files

`ls()` already parses `-a` flag into `all` variable but never uses it to filter. Add filter: when `!all`, exclude entries where `e.name.startsWith('.')`. When `all`, prepend `.` and `..` entries.

## File Changes

- `src/index.ts` — modify grep, exec (pipe), ls, all error messages
- `src/index.test.ts` — new test file
- `package.json` — add vitest dev dependency + test script
