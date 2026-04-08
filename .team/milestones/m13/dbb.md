# M13 DBB — Type Correctness & README API Docs

## Verification Criteria

1. `AgenticResult.usage` is typed as required (no `?`) in `src/types.ts`
2. `ask()` signature matches ARCHITECTURE.md spec — `systemPrompt` handled via `config` object (not positional param)
3. PRD.md `AgenticResult` block includes `shellResults` field
4. README.md contains complete API reference for `ask()`, `AgenticConfig`, and `AgenticResult`
5. All existing tests pass (`npm test`)
6. TypeScript compiles without errors (`npm run build`)
