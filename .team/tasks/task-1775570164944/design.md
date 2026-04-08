# Design: Export ShellResult from src/index.ts

## Files to Modify
- `src/index.ts`

## Change
Add `ShellResult` to the existing type export line.

Before:
```ts
export type { AgenticConfig, AgenticResult, ToolName, Source, CodeResult, FileResult, ShellResult, ToolCall } from './types.js'
```

`ShellResult` is already present in the export. Verify it is included — no change needed if confirmed.

## Test Cases
- `import type { ShellResult } from 'agentic-lite'` resolves without error
- `tsc --noEmit` passes
