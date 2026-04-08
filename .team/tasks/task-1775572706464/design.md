# Design: Export ShellResult from public API

## Status
Already implemented. `src/index.ts` line 4 exports `ShellResult` from `./types.js`.

## Verification
```ts
import type { ShellResult } from 'agentic-lite'
```
Should resolve without error. Run `npm test` to confirm no regressions.
