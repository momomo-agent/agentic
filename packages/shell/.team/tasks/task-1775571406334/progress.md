# 3+ stage pipe exit code propagation

## Progress

In pipe loop, after each middle stage (i >= 1), check if grep returned empty (exitCode=1) or error output, but only update exitCode if it's still 0 (preserve first non-zero). All 3 tests pass.
