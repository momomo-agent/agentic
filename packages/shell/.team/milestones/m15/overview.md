# m15 — Exit Code Edge Cases & Stdin No-Match

## Goals
Close remaining DBB exit code gaps identified in test-coverage.json edge cases.

## Scope
- exitCode 2 for missing operand vs exitCode 127 for command not found
- grep via stdin no-match returns exitCode 1
- output redirection combined with error (cat /missing > /out.txt)
- 3+ stage pipe where middle stage fails propagates correct exit code

## Acceptance Criteria
- `cat` with no args returns exitCode 2 (missing operand)
- `notacommand` returns exitCode 127
- `echo foo | grep bar` returns exitCode 1 (no match)
- `cat /missing > /out.txt` returns exitCode 1, does not create /out.txt
- `cat file | grep match | grep nomatch` returns exitCode 1
- All new behaviors covered by tests
