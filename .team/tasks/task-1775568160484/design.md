# Design: Expand README with API reference

## File to modify
- `README.md`

## Finding
README already contains a full API reference section with `ask()`, `AgenticConfig`, `AgenticResult`, and all tool interfaces.

## Action
After `usage` is made required in `types.ts` (task-1775568150743), update README `AgenticResult` block:
```ts
// Before
usage?: { input: number; output: number }

// After
usage: { input: number; output: number }
```

Also verify `shellResults` is documented in the README `AgenticResult` block (it already is).

## Test cases
- README `AgenticResult` matches `src/types.ts` exactly after the usage fix
