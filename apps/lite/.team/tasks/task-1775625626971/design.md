# Task Design: Browser Verification + ask.ts Slimming

## Summary

Two goals:
1. **ask.ts slimming**: Extract duplicated setup code from `ask()` and `askStream()` into a shared helper
2. **Browser verification**: Add tests confirming all tools and the ask() API work correctly in simulated browser environments

## Problem: Code Duplication in ask.ts

Current `src/ask.ts` has ~30 duplicated lines between `ask()` (lines 66-110) and `askStream()` (lines 112-151):

```typescript
// Duplicated in both functions:
const filesystem = config.filesystem ?? new AgenticFileSystem({ storage: new MemoryStorage() })
const resolvedConfig = { ...config, filesystem }
const provider: Provider = createProvider({ ... })
const tools = buildTools(resolvedConfig, ...)
const toolDefs: ToolDefinition[] = tools.map(...)
const toolMap = new Map(tools.map(...))
const executeToolCall = async (tc: ProviderToolCall) => { ... }
```

## Solution: Shared `setupAgent()` Helper

### File: `src/ask.ts`

Extract a private `setupAgent()` function that both `ask()` and `askStream()` call:

```typescript
interface AgentSetup {
  provider: Provider
  toolDefs: ToolDefinition[]
  executeToolCall: (tc: ProviderToolCall) => Promise<string>
  images: string[]
}

function setupAgent(config: AgenticConfig): AgentSetup {
  const filesystem = config.filesystem ?? new AgenticFileSystem({ storage: new MemoryStorage() })
  const resolvedConfig = { ...config, filesystem }

  const provider: Provider = createProvider({
    provider: config.provider ?? 'anthropic',
    customProvider: config.customProvider,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    model: config.model,
  })

  const images: string[] = []
  const tools = buildTools(resolvedConfig, images)
  const toolDefs: ToolDefinition[] = tools.map(t => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }))
  const toolMap = new Map(tools.map(t => [t.name, t]))

  const executeToolCall = async (tc: ProviderToolCall): Promise<string> => {
    const tool = toolMap.get(tc.name)
    if (!tool) return `Error: Unknown tool ${tc.name}`
    return String(await tool.execute(tc.input))
  }

  return { provider, toolDefs, executeToolCall, images }
}
```

Then simplify both functions:

```typescript
export async function ask(prompt: string, config: AgenticConfig = {}): Promise<AgenticResult> {
  const { provider, toolDefs, executeToolCall, images } = setupAgent(config)
  const result = await runAgentLoop({
    provider, prompt,
    systemPrompt: config.systemPrompt ?? OS_SYSTEM_PROMPT,
    toolDefs, executeToolCall,
  })
  return { answer: result.answer, images, toolCalls: ..., usage: ... }
}

export async function* askStream(prompt: string, config: AgenticConfig = {}) {
  const { provider, toolDefs, executeToolCall } = setupAgent(config)
  for await (const chunk of runAgentLoopStream({
    provider, prompt,
    systemPrompt: config.systemPrompt ?? OS_SYSTEM_PROMPT,
    toolDefs, executeToolCall,
  })) {
    yield chunk
  }
}
```

**Note**: `askStream()` currently does NOT pass `imagesCollector` to `buildTools()`, so search images won't be collected in streaming mode. The shared helper fixes this — both paths get the images array.

### Lines reduced
- Before: 152 lines
- After: ~120 lines (remove ~30 lines of duplication)

## Browser Verification

### What to verify

1. **Default filesystem is MemoryStorage** — no `localStorage` or `IndexedDB` dependency
2. **Shell tool is excluded in browser** — `isNodeEnv()` returns false, `buildTools()` skips shell
3. **Code execution works** — QuickJS (JS) and Pyodide (Python) paths work without Node
4. **ask() works end-to-end in browser** — full integration test with mock provider + MemoryStorage
5. **askStream() works end-to-end in browser** — streaming path also works in browser

### File: `test/browser-verification.test.ts`

Test structure:
```typescript
describe('Browser Verification', () => {
  // Save/restore process to simulate browser
  const origProcess = globalThis.process

  beforeEach(() => {
    // @ts-expect-error - simulate browser by removing process
    delete (globalThis as any).process
  })

  afterEach(() => {
    globalThis.process = origProcess
  })

  test('default filesystem is MemoryStorage', async () => {
    // Call ask() with no filesystem config → verify it doesn't throw
    // about missing localStorage/IndexedDB
  })

  test('shell tool excluded in browser', () => {
    // Verify buildTools() with tools:['shell'] returns no shell tool
    // when isNodeEnv() is false
  })

  test('code_exec works without Node', async () => {
    // Execute simple JS via QuickJS → verify output
  })

  test('ask() works in browser with mock provider', async () => {
    // Full ask() call with customProvider mock + MemoryStorage
  })

  test('askStream() works in browser with mock provider', async () => {
    // Full askStream() call with customProvider mock + MemoryStorage
  })
})
```

## Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/ask.ts` | Modify | Extract `setupAgent()`, simplify `ask()` and `askStream()` |
| `test/browser-verification.test.ts` | Create | Browser environment verification tests |

## Edge Cases

- **process.env access**: Some code may reference `process.env` — verify `isNodeEnv()` guard catches this
- **Dynamic imports**: tsup may bundle Node-only deps — verify build output has no `child_process` references
- **askStream images**: Currently not collected (bug) — the shared helper fixes this by always passing `images` to `buildTools()`
- **Backward compatibility**: The public API (`ask()`, `askStream()`, all types) must remain identical

## Dependencies

- None — this is a self-contained refactor + test addition
- Does NOT modify agentic-core or any external packages

## Test Cases to Verify

1. All existing tests still pass after refactor (backward compat)
2. New browser-verification tests all pass
3. `grep` for duplicated code pattern in ask.ts shows no remaining duplication
4. ask.ts line count decreases
