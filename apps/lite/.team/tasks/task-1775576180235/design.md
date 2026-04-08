# Design: Default in-memory AgenticFileSystem for zero-config usage

## Files to Modify
- `src/ask.ts`

## Approach

`AgenticConfig.filesystem` is optional. When not provided, `file_read`, `file_write`, `code_exec`, and `shell_exec` all receive `undefined`. Instead of propagating `undefined`, `ask()` should create a default in-memory filesystem once and use it throughout the call.

`agentic-filesystem` already exports an in-memory implementation. We instantiate it lazily at the top of `ask()` when `config.filesystem` is absent.

## Changes

### `src/ask.ts`

```ts
import { AgenticFileSystem, MemoryStorage } from 'agentic-filesystem'

export async function ask(prompt: string, config: AgenticConfig): Promise<AgenticResult> {
  // Resolve filesystem: use caller-supplied or create a default in-memory instance
  const filesystem: AgenticFileSystem = config.filesystem ?? new AgenticFileSystem({ storage: new MemoryStorage() })
  const resolvedConfig = { ...config, filesystem }
  // ... rest of function uses resolvedConfig instead of config
```

All downstream calls (`executeCode`, `executeFileRead`, `executeFileWrite`, `executeShell`) already accept `AgenticFileSystem | undefined` — passing the resolved instance satisfies them without further changes.

## Edge Cases
- Caller passes explicit `filesystem`: used as-is, no default created.
- Caller omits `filesystem`: fresh in-memory instance scoped to this `ask()` call; not shared across calls.
- `AgenticFileSystem` constructor must accept zero arguments (verify against `agentic-filesystem` API; if not, check its docs for the correct no-arg factory).

## Dependencies
- `agentic-filesystem` package (already a dependency).

## Test Cases
1. `ask(prompt, { provider, apiKey, model })` with no `filesystem` — succeeds, no error thrown.
2. Agent writes `/tmp/out.txt` then reads it back in same session — content matches.
3. `ask(prompt, { ..., filesystem: customFs })` — `customFs` is used; writes are visible on `customFs`.
