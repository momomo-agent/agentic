# M14 Done-By-Definition (DBB)

## Milestone: Public API Completeness & Type Correctness

### Verification Criteria

1. `AgenticResult.images` is typed as `string[]` (required) in `src/types.ts`
2. `ShellResult` is exported from `src/index.ts`
3. `shellToolDef` and `executeShell` are exported from `src/tools/index.ts`
4. Custom provider silent fallback (`provider='custom'` + `baseUrl` → OpenAI adapter) is documented in README or JSDoc

### Pass Conditions

- `tsc --noEmit` passes with zero errors
- All four items above are verifiable by inspection of source files
