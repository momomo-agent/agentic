# Task Design: Fix AgenticResult.shellResults type completeness

## Files to Modify
- `src/tools/shell.ts` — remove duplicate `ShellResult` interface, import from types.ts
- `src/types.ts` — verify `ShellResult` and `AgenticResult.shellResults` are correct (no changes expected)

## Current State
- `src/types.ts` exports `ShellResult { command, output, error?, exitCode }` ✓
- `src/types.ts` has `AgenticResult.shellResults?: ShellResult[]` ✓
- `src/tools/shell.ts` also declares a local `ShellResult` interface — duplicate

## Change in shell.ts

Remove:
```ts
export interface ShellResult {
  command: string
  output: string
  error?: string
  exitCode: number
}
```

Add import at top:
```ts
import type { ShellResult } from '../types.js'
```

## Function Signatures (unchanged)
```ts
export async function executeShell(
  input: Record<string, unknown>,
  filesystem?: AgenticFileSystem,
): Promise<ShellResult>
```

## Edge Cases
- Ensure no other file imports `ShellResult` from `shell.ts` — check with grep before removing

## Test Cases
- `tsc --noEmit` passes with no type errors
- `ShellResult` imported from `types.ts` in shell.ts
- `AgenticResult.shellResults` is `ShellResult[] | undefined`
