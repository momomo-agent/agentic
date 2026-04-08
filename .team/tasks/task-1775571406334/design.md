# Design — 3+ stage pipe exit code propagation

## File to modify
- `src/index.ts`

## Problem
The pipe loop (line ~84) only checks the first segment for errors via `isErrorOutput`. Middle stages that return empty (grep no-match) don't set exitCode until the very end, and `exitCodeFor('')` returns 0.

## Fix: carry exitCode through all stages

This task depends on task-1775571390938 (grep stdin no-match exitCode 1) which fixes the per-stage exitCode tracking. Once that fix is in place, the pipe loop already propagates exitCode correctly because:

1. Each stage sets `exitCode` if grep returns empty or output is an error
2. Final `exitCode` is not overwritten if already non-zero

Verify the pipe loop correctly preserves non-zero exitCode from middle stages:

```typescript
// After execWithStdin for each stage i >= 1:
const segCmd = seg.trim().split(/\s+/)[0]
if (segCmd === 'grep' && output === '') {
  exitCode = 1
} else if (this.isErrorOutput(output)) {
  exitCode = this.exitCodeFor(output)
}
// Do NOT reset exitCode to 0 after a later stage succeeds
// Final: if exitCode === 0, compute from final output
if (exitCode === 0) exitCode = this.exitCodeFor(output)
return { output, exitCode }
```

Key invariant: once exitCode is set non-zero by a middle stage, it is not overwritten by a later stage returning empty or success.

## Edge cases
- `cat f | grep match | grep nomatch` → middle grep matches, last grep no-match → exitCode 1
- `cat f | grep nomatch | grep anything` → first grep no-match (empty stdin to next) → exitCode 1
- `cat f | grep match | grep match2` → all match → exitCode 0

## Test cases
```typescript
it('propagates exitCode 1 from last grep stage', async () => {
  await fs.write('/f.txt', 'hello world')
  const r = await shell.exec('cat /f.txt | grep hello | grep nomatch')
  expect(r.exitCode).toBe(1)
})
it('returns exitCode 0 when all stages match', async () => {
  await fs.write('/f.txt', 'hello world')
  const r = await shell.exec('cat /f.txt | grep hello | grep world')
  expect(r.exitCode).toBe(0)
})
```
