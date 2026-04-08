# DBB Check — M14

**Match: 100/100** | 2026-04-08T12:00:00Z

## Results

| Criterion | Status |
|-----------|--------|
| AgenticResult.images is typed as string[] (required) in src/types.ts | pass |
| ShellResult is exported from src/index.ts | pass |
| shellToolDef and executeShell are exported from src/tools/index.ts | pass |
| Custom provider silent fallback documented in README or JSDoc | pass |
| tsc --noEmit passes with zero errors | pass |

## Evidence

- `types.ts:42` — `images: string[]` (no `?`)
- `src/index.ts:5` — `ShellResult` in exports
- `src/tools/index.ts:4` — `shellToolDef, executeShell` exported
- `README.md:198-218` — Custom Provider section documents baseUrl fallback pattern
- `types.ts:17-19` — JSDoc on `baseUrl` documents fallback behavior
