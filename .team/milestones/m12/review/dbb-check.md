# DBB Check — Milestone m12

**Milestone**: Exit Codes, Input Redirection & Glob Expansion
**Match**: 100%
**Date**: 2026-04-08

## Summary

All 14 DBB criteria pass. Exit codes are properly implemented via `exitCodeFor()` returning 0/1/2. Input redirection `<` works in `execPipeline()`. Glob expansion `*`, `?` patterns are supported via `expandGlob()`/`matchGlob()`.

## Criteria Results

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Exit code 0 on success | pass | `execPipeline()` returns `{output, exitCode: 0}` for successful commands |
| Exit code 1 on error | pass | `exitCodeFor()` regex `/^\w[\w-]*: .+: .+/` returns 1 for error output |
| Exit code 2 on misuse | pass | `exitCodeFor()` regex `/\bcommand not found\b/` and `/\b(missing operand)\b/` return 2 |
| Exit code pipe propagation | pass | `execPipeline()` lines 164-186 track exitCode through pipe segments |
| Exit code always in output object | pass | `exec()` signature: `Promise<{ output: string; exitCode: number }>` |
| Input redirection grep < file | pass | `execPipeline()` lines 101-134 parse `<` and pass file content as stdin |
| Input redirection file not found | pass | Line 109: returns `bash: <file>: No such file or directory` with exitCode 1 |
| Input redirection no match | pass | `execWithStdin()` handles empty stdin correctly |
| Input redirection combined with > | pass | Lines 114-131 handle `>>` and `>` after `<` |
| Glob expansion ls *.ts | pass | `expandGlob()` (line 432) expands `*`, `?` patterns in ls pathArg |
| Glob expansion no match | pass | Line 480: `ls: ${pathArg}: No such file or directory` |
| Glob expansion with grep | pass | grep() lines 544-554 expand globs in file path arguments |
| Glob ? wildcard | pass | `matchGlob()` line 394: `?` maps to `.` regex |
| All m12 tests pass | pass | exit-codes-m12 (10), input-redirection-m12 (5), glob-pattern-m12 (5) — 20/20 pass |

## Test Results

- 62/63 test files pass
- 508/515 tests pass (7 failures in architecture-alignment-m28, unrelated to m12)
