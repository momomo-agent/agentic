# Task Design: Expand README.md with full API documentation

## File to Modify
- `README.md` (project root)

## Sections to Add

### 1. Installation
```md
## Installation
npm install agentic-lite
```

### 2. Quick Start
Show minimal `ask()` call with anthropic provider.

### 3. ask() API Reference
```ts
ask(prompt: string, config: AgenticConfig): Promise<AgenticResult>
```
Document all `AgenticConfig` fields:
- `provider?: 'anthropic' | 'openai' | 'custom'`
- `apiKey: string`
- `model?: string`
- `baseUrl?: string`
- `customProvider?: Provider`
- `systemPrompt?: string`
- `tools?: ToolName[]` — `'search' | 'code' | 'file' | 'shell'`
- `filesystem?: AgenticFileSystem`
- `toolConfig?.search.apiKey`, `toolConfig?.search.provider`
- `toolConfig?.code.timeout`

### 4. Tools Reference
One subsection each:
- `code_exec` — executes JS via AsyncFunction, returns `CodeResult[]`
- `shell_exec` — runs shell commands via AgenticShell, returns `ShellResult[]`
- `file_read` / `file_write` — file I/O via AgenticFileSystem, returns `FileResult[]`
- `search` — web search, returns `Source[]`

### 5. AgenticResult Shape
Document all fields matching `src/types.ts`.

## Edge Cases
- Keep existing content (installation line already present — extend, don't duplicate)

## Test Cases
- README.md contains `ask(` string
- README.md contains `shell_exec` string
- README.md contains `AgenticResult` string
