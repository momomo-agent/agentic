# agentic-lite PRD

## Overview
agentic-lite is a lightweight agent library for Node.js and browsers. It is the integration layer that combines agentic-core (agent loop + provider abstraction) with tool implementations. Target users: developers who need a simple `ask()` API with built-in tool use.

## Architecture
agentic-lite = agentic-core (LLM loop, providers, types) + agentic-filesystem (file I/O) + agentic-shell (shell exec) + tool implementations (search, code, file, shell).

## Agent Loop
Delegated to agentic-core. `ask(prompt, config)` calls `runAgentLoop()` from agentic-core, which runs a multi-round loop: calls the LLM via the configured provider, executes any tool calls, feeds results back, and repeats until `stopReason !== 'tool_use'`.

## Tools
- `search` — web search, returns sources
- `code_exec` — executes JS/Python code via quickjs-emscripten sandbox (browser-compatible) with auto-language detection. Python uses Pyodide (browser) or python3 subprocess (Node). Injects filesystem API (fs object for JS, open() for Python) backed by AgenticFileSystem.
- `file_read` / `file_write` — file I/O via AgenticFileSystem (browser-compatible)
- `shell_exec` — executes shell commands via agentic-shell (Node.js only, returns descriptive error in browser)

## Provider Config
| Field | Description |
|---|---|
| `provider` | `'anthropic'` \| `'openai'` \| `'custom'` |
| `apiKey` | Required for anthropic/openai |
| `model` | Model name override |
| `baseUrl` | Custom endpoint |
| `customProvider` | Required when `provider='custom'` |
| `systemPrompt` | Optional system prompt |

## AgenticResult
```ts
{
  answer: string
  sources: Source[]
  images: string[]
  codeResults: CodeResult[]
  files: FileResult[]
  toolCalls: ToolCall[]
  usage: { input: number; output: number }
  shellResults?: ShellResult[]
}
```