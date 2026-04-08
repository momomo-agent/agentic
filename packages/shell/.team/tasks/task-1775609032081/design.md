# Technical Design — Background Jobs Test Coverage

## Summary
Add comprehensive test coverage for the existing background job implementation (`&`, `jobs`, `fg`, `bg`) in `src/index.test.ts`. No production code changes — only tests.

## Files to Modify
- `src/index.test.ts` — add new `describe('background jobs', ...)` block

## Test Cases

### Test block structure
```typescript
describe('background jobs', () => {
  let fs: AgenticFileSystem
  let sh: AgenticShell

  beforeEach(() => {
    fs = makeMockFs()
    sh = new AgenticShell(fs)
  })
  // ... tests below
})
```

### 1. Trailing `&` spawns background job and returns job ID
```
it('should return job ID for background command')
```
- Execute: `run(sh, 'echo hello &')`
- Assert output matches `/\[1\] 1/`
- Assert `exec()` returned immediately (did not block on `echo hello`)

### 2. Background job completes and is retrievable via `fg`
```
it('should retrieve background output via fg')
```
- Execute: `run(sh, 'echo hello &')` — returns `[1] 1`
- Await `fg` (which awaits the internal promise): `run(sh, 'fg %1')`
- Assert output is `'hello'`
- Assert job removed from map (calling `jobs` again should not list it)

### 3. `jobs` command lists running/completed jobs
```
it('should list jobs with status')
```
- Execute: `run(sh, 'echo hello &')`
- Execute: `run(sh, 'jobs')`
- Assert output contains `[1]` and `echo hello`
- Assert status is either `running` or `done` (timing-dependent)

### 4. `fg` with `%N` syntax
```
it('should support fg with percent prefix')
```
- Execute: `run(sh, 'echo test &')`
- Execute: `run(sh, 'fg %1')`
- Assert output is `'test'`

### 5. `fg` without argument uses most recent job
```
it('should fg most recent job when no arg given')
```
- Execute: `run(sh, 'echo first &')`  → job 1
- Execute: `run(sh, 'echo second &')` → job 2
- Execute: `run(sh, 'fg')`  → should grab job 2
- Assert output is `'second'`

### 6. `bg` validates job exists
```
it('should error on bg with invalid job ID')
```
- Execute: `run(sh, 'bg %99')`
- Assert output is `'bg: %99: no such job'`

### 7. `fg` errors on invalid/missing job
```
it('should error on fg with no jobs')
```
- Execute: `run(sh, 'fg')`
- Assert output is `'fg: current: no such job'`

```
it('should error on fg with invalid job ID')
```
- Execute: `run(sh, 'fg %99')`
- Assert output is `'fg: %99: no such job'`

### 8. Empty `&` command returns error
```
it('should error on empty background command')
```
- Execute: `run(sh, '&')`
- Assert output is `'exec: missing command'` and exit code is 1

### 9. Multiple background jobs get sequential IDs
```
it('should assign sequential job IDs')
```
- Execute: `run(sh, 'echo a &')` → asserts `[1] 1`
- Execute: `run(sh, 'echo b &')` → asserts `[2] 2`

### 10. `jobs` returns empty string when no jobs
```
it('should return empty string for jobs with no active jobs')
```
- Execute: `run(sh, 'jobs')`
- Assert output is `''`

## Edge Cases & Error Handling
- `fg` with no jobs in map → `'fg: current: no such job'`
- `fg %99` when only job 1 exists → `'fg: %99: no such job'`
- `bg %99` when no jobs → `'bg: %99: no such job'`
- Bare `&` (empty command) → `'exec: missing command'` with exitCode 1
- `jobs` on empty map → `''` (empty string, not error)

## Dependencies
- `makeMockFs()` helper already in test file
- `run()` helper already in test file
- `AgenticShell` class from `src/index.ts`
- No additional imports needed

## Acceptance Criteria
- ≥6 test cases covering all background job code paths
- All tests pass
- Covers: `isBackground`, `jobs_cmd`, `fg`, `bg`, and the background branch in `exec()`
