# Design: Re-run Full Test Suite

## Steps
1. `npm test`
2. Parse output for pass/fail counts
3. Confirm passing >= 591 out of 657

## Pass criteria
`>=591/657` tests pass (>=90%).

## Fail path
If <90%, report exact count and failing test names to PM for triage.
