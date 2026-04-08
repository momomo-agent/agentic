# Design: Export shell tool defs from tools/index.ts

## Status
Already implemented. `src/tools/index.ts` exports `shellToolDef` and `executeShell` from `./shell.js`.

## Verification
```ts
import { shellToolDef, executeShell } from 'agentic-lite/tools'
```
Run `npm test` to confirm no regressions.
