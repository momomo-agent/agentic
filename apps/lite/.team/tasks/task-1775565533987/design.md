# Design: Create ARCHITECTURE.md

## File to create

### ARCHITECTURE.md (project root)

Content outline:
1. **Overview** — what agentic-lite is
2. **Module structure**
   - `src/index.ts` — public exports
   - `src/ask.ts` — core agent loop (`ask()`)
   - `src/types.ts` — all shared interfaces
   - `src/providers/` — LLM provider adapters (`anthropic.ts`, `openai.ts`, `custom.ts`, `index.ts`)
   - `src/tools/` — tool implementations (`search.ts`, `code.ts`, `file.ts`, `shell.ts`, `index.ts`)
3. **Data flow** — `ask()` → `createProvider()` → loop: `provider.chat()` → `executeToolCalls()` → repeat until `stopReason !== 'tool_use'`
4. **Key interfaces** — `AgenticConfig`, `AgenticResult`, `Provider`, `ToolDefinition`

## Edge cases
- No logic changes; documentation only
- Must match actual source structure (verified above)

## Test cases
- File exists at project root
- Contains sections: module structure, data flow, key interfaces
