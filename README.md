# agentic-lite

Lightweight agentic AI framework with tool support for code execution, file I/O, shell commands, and web search.

## Installation
```bash
npm install agentic-lite
```

## Quick Start

```typescript
import { ask } from 'agentic-lite'

const result = await ask('What is 2+2?', {
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  tools: ['code']
})

console.log(result.answer)
```

## API Reference

### ask(prompt, config)

Main function to interact with the AI agent.

**Parameters:**
- `prompt: string` - The user's question or instruction
- `config: AgenticConfig` - Configuration object

**Returns:** `Promise<AgenticResult>`

### AgenticConfig

Configuration options for the agent:

```typescript
interface AgenticConfig {
  // Provider settings
  provider?: 'anthropic' | 'openai' | 'custom'  // Default: auto-detect from apiKey
  apiKey?: string                                // Required for standard providers; optional when provider='custom'
  model?: string                                 // Optional: model name (e.g., 'claude-3-5-sonnet-20241022')
  baseUrl?: string                               // Optional: custom API endpoint
  customProvider?: Provider                      // Optional: custom provider implementation
  systemPrompt?: string                          // Optional: system prompt for the LLM

  // Tool configuration
  tools?: ToolName[]                             // Optional: ['search', 'code', 'file', 'shell']
  filesystem?: AgenticFileSystem                 // Virtual filesystem (optional — defaults to in-memory storage, browser-compatible)
  toolConfig?: {
    search?: {
      apiKey?: string                            // Search API key (Tavily/Serper)
      provider?: 'tavily' | 'serper'             // Search provider
    }
    code?: {
      timeout?: number                           // Code execution timeout in ms
    }
  }
}
```

### AgenticResult

Result object returned by `ask()`:

```typescript
interface AgenticResult {
  answer: string              // Final answer text
  sources?: Source[]          // Sources used (from search tool)
  images: string[]            // Images from search results
  codeResults?: CodeResult[]  // Code execution results
  files?: FileResult[]        // Files read/written
  shellResults?: ShellResult[] // Shell command results
  toolCalls?: ToolCall[]      // Raw tool calls made
  usage: {                    // Token usage
    input: number
    output: number
  }
}
```

## Tools

### code_exec

Executes JavaScript or Python code in a sandboxed environment.

- **JavaScript**: Uses quickjs-emscripten for browser-compatible isolation
- **Python**: Uses Pyodide (browser) or child_process (Node.js)
- **Filesystem access**: Code can access the virtual filesystem via injected `fs` object (JS) or `open()` (Python)

**Returns:** `CodeResult[]`

```typescript
interface CodeResult {
  code: string      // Code that was executed
  output: string    // stdout/return value
  error?: string    // Error message if execution failed
}
```

#### Python execution and Pyodide

`code_exec` runs Python in the browser via [Pyodide](https://pyodide.org), which is loaded dynamically from CDN (`https://cdn.jsdelivr.net/pyodide/...`).

**Limitations:**
- Requires network access to the CDN on first use
- Blocked in environments with strict CSP or no internet access

**Workarounds:**
- **Self-host Pyodide**: Download the Pyodide distribution and serve it from your own origin. Set the `indexURL` option if the `code_exec` tool exposes it, or patch the dynamic import URL before bundling.
- **Disable Python**: Omit `'code'` from `config.tools` to skip `code_exec` entirely when CDN access is unavailable.

### shell_exec

> **Note:** `shell_exec` is Node.js-only. In browser environments it returns a descriptive error instead of crashing.

Executes shell commands against the virtual filesystem.

- Supports common commands: `ls`, `cat`, `grep`, `find`, `pwd`, etc.
- Uses `agentic-shell` for browser-compatible shell emulation
- Uses in-memory filesystem by default (no config required)

**Returns:** `ShellResult[]`

```typescript
interface ShellResult {
  command: string   // Command that was executed
  output: string    // Command output
  error?: string    // Error message if command failed
  exitCode: number  // Exit code (0 = success)
}
```

### file_read / file_write

Read and write files using the virtual filesystem.

- Browser-compatible via `agentic-filesystem`
- Uses in-memory filesystem by default (no config required)
- Supports both absolute and relative paths

**Returns:** `FileResult[]`

```typescript
interface FileResult {
  path: string              // File path
  action: 'read' | 'write'  // Operation performed
  content?: string          // File content (for read operations)
}
```

### search

Web search using Tavily or Serper API.

- Returns search results with titles, URLs, and snippets
- Requires `toolConfig.search.apiKey` in config
- Supports image results

**Returns:** `Source[]`

```typescript
interface Source {
  title: string     // Result title
  url: string       // Result URL
  snippet?: string  // Text snippet
}
```

## Examples

### Using Multiple Tools

```typescript
import { ask } from 'agentic-lite'
import { AgenticFileSystem } from 'agentic-filesystem'

const fs = new AgenticFileSystem()
await fs.writeFile('/data.txt', 'Hello World')

const result = await ask('Read data.txt and count the words', {
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  tools: ['file', 'code'],
  filesystem: fs
})

console.log(result.answer)
console.log('Files accessed:', result.files)
console.log('Code executed:', result.codeResults)
```

### Custom Provider

When `provider='custom'`, resolution order:
1. `customProvider` set → use it directly
2. `customProvider` absent + `baseUrl` set → falls back to OpenAI-compatible provider
3. Both absent → throws `Error('customProvider or baseUrl is required when provider="custom"')`

```typescript
// Option 1: baseUrl fallback (OpenAI-compatible endpoint, apiKey optional)
const result = await ask('Hello', {
  provider: 'custom',
  baseUrl: 'https://my-proxy.com/v1',
  model: 'custom-model'
})

// Option 2: fully custom provider implementation (no apiKey needed)
const result = await ask('Hello', {
  provider: 'custom',
  customProvider: myProviderFn,
  model: 'my-model'
})
```

### System Prompt

```typescript
const result = await ask('What should I do?', {
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  systemPrompt: 'You are a helpful coding assistant. Always provide code examples.'
})
```

## License

MIT
