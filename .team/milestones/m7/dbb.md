# M7 Done-By-Definition (DBB)

## Verification Criteria

### 1. Custom Provider Support
- `createProvider({ provider: 'custom', baseUrl: '...', apiKey: '...' })` creates an OpenAI-compatible client using `baseUrl` + `apiKey` (no `customProvider` object required)
- Unknown provider strings (e.g. `provider: 'foobar'`) throw `Error('Unknown provider: foobar')`
- `provider: 'custom'` without `baseUrl` throws a clear error

### 2. Multi-Round Tool Loop
- `ask()` already loops up to `MAX_TOOL_ROUNDS` — verify no regression from task-1775530939117 changes
- After task fix: loop continues until `stopReason !== 'tool_use'` OR rounds exhausted
- Exceeding `MAX_TOOL_ROUNDS` throws `Error('Agent loop exceeded 10 rounds')`

### 3. Regression
- All existing tests pass (`pnpm test`)
- `detectProvider` still works for anthropic/openai key heuristics
