# M15 DBB — ARCHITECTURE.md & Type Correctness

## Verification Criteria

1. `ARCHITECTURE.md` exists at repo root covering: module structure, key interfaces, data flow, provider resolution, tool system, multi-round loop
2. `src/types.ts` `AgenticResult.usage` is required (no `?`)
3. `src/types.ts` `AgenticResult.images` is `string[]` (no `undefined` union)
4. `PRD.md` `AgenticResult` section includes `shellResults` field
5. All existing tests pass (`npm test`)
