# Design — m15: Exit Code Edge Cases & Stdin No-Match

## Overview
Four targeted fixes to `src/index.ts` to correct exit code semantics:
1. exitCode 127 for unknown commands (vs 2 for missing operands)
2. exitCode 1 for grep stdin no-match
3. Skip output file write when source command fails
4. Propagate non-zero exitCode through all pipe stages

## Changes to `src/index.ts`

### 1. exitCodeFor — add 127 for command not found
```typescript
private exitCodeFor(output: string): number {
  const first = output.trimStart().split('\n')[0]
  if (/\bcommand not found\b/.test(first)) return 127
  if (/\b(missing operand|missing pattern|Invalid regular expression)\b/.test(first)) return 2
  if (/^\w[\w-]*: .+: .+/.test(first)) return 1
  return 0
}
```

### 2. execWithStdin grep — return sentinel for no-match
`execWithStdin` currently returns `''` for no-match. The pipe loop must detect this and set exitCode 1. Two options:
- **Option A**: Return a typed result `{ output: string; exitCode: number }` from `execWithStdin` (requires refactor)
- **Option B**: Track grep no-match via a flag in the pipe loop (minimal change)

Use Option B: in the pipe loop, after calling `execWithStdin`, check if the segment was a grep and output is empty → exitCode 1.

### 3. Output redirection — check exitCode before writing
In `exec()` writeMatch/appendMatch branches: call `execSingle`, compute exitCode, skip write if exitCode !== 0.

### 4. Pipe loop — propagate exitCode across all stages
Current loop only checks first segment for errors. Fix: after each `execWithStdin` call, compute exitCode and carry it forward to final result.

## Tasks
- task-1775571373147: fix `exitCodeFor` (127 vs 2)
- task-1775571390938: fix grep stdin no-match → exitCode 1
- task-1775571401881: fix redirection to skip write on error
- task-1775571406334: fix pipe loop to propagate exitCode
