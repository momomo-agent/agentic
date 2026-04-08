# m19 — Done-By-Definition (DBB)

## DBB-001: Pipe error propagation
- `exec('cat nonexistent | grep foo')` passes empty string as stdin to grep (not short-circuit)
- Right command receives `''` stdin when left command fails
- Overall exitCode reflects the error from the left command

## DBB-002: grep -l stdin identifier
- `grep -l pattern` in stdin mode returns `(stdin)` (not empty string)
- `grep -l pattern` with no matches in stdin returns `''`

## DBB-003: rm -r deep nesting (no stack overflow)
- `rm -r` on a 15-level deep directory tree completes without stack overflow
- Iterative traversal visits all nodes and deletes them bottom-up

## DBB-004: Coverage gate enforced
- `vitest --coverage` reports statement coverage ≥ 80%
- `vitest --coverage` reports branch coverage ≥ 75%
- Total test count ≥ 148
- `vitest.config.ts` thresholds block CI if coverage drops below gate
