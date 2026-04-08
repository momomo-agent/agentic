# Task Design: Expose streaming API in agentic-lite

## Files to Modify

1. `src/ask.ts` — add `askStream()` function
2. `src/index.ts` — export `askStream`

## Depends On

- task-1775620573568 (streaming Provider interface in agentic-core)

## askStream() — `src/ask.ts`

Add after existing `ask()` function:

```typescript
export async function* askStream(prompt: string, config: AgenticConfig = {}): AsyncGenerator<AgentStreamChunk> {
  // Resolve config with defaults (same as ask())
  const resolvedConfig: AgenticConfig = { provider: 'anthropic', ...config }

  // Default filesystem to in-memory (same as ask())
  const filesystem = config.filesystem ?? new AgenticFileSystem({ storage: new MemoryStorage() })

  // Create provider
  const provider = createProvider(resolvedConfig)

  // Build tool definitions
  const tools = config.tools ?? ['search']
  const toolDefs = buildToolDefs(tools)

  // Accumulators (same pattern as ask())
  const sources: Source[] = []
  const codeResults: CodeResult[] = []
  const files: FileResult[] = []
  const shellResults: ShellResult[] = []
  const images: string[] = []

  // Execute tool call handler (same as ask())
  const handleToolCall = async (tc: ProviderToolCall): Promise<string> => {
    switch (tc.name) {
      case 'web_search': {
        const result = await executeSearch(tc.input, resolvedConfig.toolConfig?.search)
        if (result.sources) sources.push(...result.sources)
        if (result.images) images.push(...result.images)
        return result.output
      }
      case 'code_exec': {
        const timeout = resolvedConfig.toolConfig?.code?.timeout
        const result = await executeCode(tc.input, filesystem, timeout)
        codeResults.push(result)
        return result.output + (result.error ? `\nError: ${result.error}` : '')
      }
      case 'file_read': {
        const result = await executeFileRead(tc.input, filesystem)
        files.push(result)
        return result.content ?? ''
      }
      case 'file_write': {
        const result = await executeFileWrite(tc.input, filesystem)
        files.push(result)
        return `Wrote ${result.path}`
      }
      case 'shell_exec': {
        const result = await executeShell(tc.input)
        shellResults.push(result)
        return result.output + (result.error ? `\nError: ${result.error}` : '')
      }
      default:
        return `Unknown tool: ${tc.name}`
    }
  }

  // Delegate to agentic-core streaming loop
  for await (const chunk of runAgentLoopStream({
    provider,
    prompt,
    systemPrompt: buildSystemPrompt(resolvedConfig.systemPrompt),
    toolDefs,
    executeToolCall: handleToolCall,
  })) {
    yield chunk
  }
}
```

### Key design decisions:
- Accumulator pattern is identical to `ask()` — sources, codeResults, files, shellResults, images are collected during tool execution
- The generator yields `AgentStreamChunk` objects directly from `runAgentLoopStream()` — no transformation needed
- `handleToolCall` is shared logic with `ask()` — consider extracting to a helper, but for now duplicate to keep ask() unchanged
- Timeout parameter is threaded to `executeCode()` (depends on task 3)

## Export — `src/index.ts`

Add to exports:

```typescript
export { ask, askStream } from './ask.js'
```

## Edge Cases

- **Empty prompt**: Generator yields done with empty answer immediately
- **No tools configured**: Works fine — loop yields text chunks then done
- **Config with custom provider**: Custom provider must implement `stream()` — throws if not

## Test Cases

- `askStream()` with mock provider → yields text chunks then done
- `askStream()` with tools → yields tool_start, tool_result, then done
- `askStream()` accumulates sources/codeResults same as `ask()`

## Dependencies

- task-1775620573568 (streaming Provider + runAgentLoopStream)
- task-1775620592995 (timeout parameter in executeCode) — optional, can default to no timeout
