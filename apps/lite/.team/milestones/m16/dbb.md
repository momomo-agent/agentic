# DBB — m16: Public API Exports & Provider Docs

## Verification Criteria

1. `ShellResult` importable from package root: `import type { ShellResult } from 'agentic-lite'`
2. `shellToolDef` and `executeShell` exported from `src/tools/index.ts`
3. ARCHITECTURE.md documents custom provider fallback (baseUrl without customProvider → OpenAI-compatible adapter)
4. README documents the same fallback with usage example
5. `npm test` passes with no regressions
