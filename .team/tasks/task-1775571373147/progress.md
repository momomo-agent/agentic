# exitCode 2 vs 127 distinction

## Progress

Fixed `exitCodeFor()` to return 127 for unknown commands, 2 for missing operands. Also added `rm: missing operand` guard. All 5 tests pass.
