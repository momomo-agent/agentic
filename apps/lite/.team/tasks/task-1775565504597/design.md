# Design: Fix public API exports — ShellResult and shell tools

## Files to modify

### src/index.ts
Add `ShellResult` to the type export line:
```ts
export type { AgenticConfig, AgenticResult, ToolName, Source, CodeResult, FileResult, ShellResult, ToolCall } from './types.js'
```

### src/tools/index.ts
Add shell exports:
```ts
export { shellToolDef, executeShell } from './shell.js'
```

## Edge cases
- No logic changes; purely additive exports
- Verify `ShellResult` is already defined in types.ts (confirmed: it is)
- Verify `shellToolDef`/`executeShell` are already exported from shell.ts (confirmed: they are)

## Test cases
- `import { ShellResult } from 'agentic-lite'` compiles without error
- `import { shellToolDef, executeShell } from 'agentic-lite/src/tools/index.js'` resolves
- `tsc --noEmit` passes
