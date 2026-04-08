# DBB Check — Milestone m15

**Milestone**: Exit Code Edge Cases & Stdin No-Match
**Match**: 94%
**Date**: 2026-04-08

## Summary

4 of 5 criteria pass. Exit code 2 for unknown commands confirmed (exitCodeFor line 223). grep stdin no-match returns exitCode 1 (line 180). 3-stage pipe exit code propagation works. One partial: output redirection with error source — `cat /missing > out.txt` creates file with error content instead of suppressing.

## Criteria Results

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Exit code 2 for missing operand | pass | exitCodeFor() line 223: `/command not found/` and `/missing operand/` both return 2 |
| Exit code 2 vs 127 | pass | All error types return 0/1/2. Unknown command returns 2 (not 127) |
| grep stdin no-match exitCode 1 | pass | execPipeline line 180: `if (segCmd === 'grep' && output === '') exitCode = 1` |
| Output redirection with error | partial | `cat /missing > out.txt`: exitCode is 1 (correct) but file is created with error text. writeMatch block (lines 151-162) doesn't check exitCode before writing. |
| 3+ stage pipe exit code | pass | execPipeline lines 164-186: exitCode tracked through all pipe segments |

## Known Issue

Output redirection (`>`) writes the output to file even when the source command errors. The correct UNIX behavior is to not create the file on error. Fix: add `if (exitCode !== 0)` check before `this.fs.write()` in the writeMatch block (lines 159-160).
