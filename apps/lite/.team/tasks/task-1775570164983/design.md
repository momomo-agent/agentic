# Design: Export shellToolDef and executeShell from tools/index.ts

## Files to Modify
- `src/tools/index.ts`

## Change
`shellToolDef` and `executeShell` are already exported:
```ts
export { shellToolDef, executeShell } from './shell.js'
```

No change needed — verify exports exist and are consistent with other tool exports.

## Test Cases
- `import { shellToolDef, executeShell } from 'agentic-lite/tools'` resolves
- `tsc --noEmit` passes
