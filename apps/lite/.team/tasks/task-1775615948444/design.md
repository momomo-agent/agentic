# Task Design: Update ARCHITECTURE.md for agentic-core

## Overview

After the extraction is complete (tasks 1775615888978, 1775615923116, 1775613090477), update ARCHITECTURE.md to reflect the new module structure.

**Important**: This task is owned by the `architect` role. The tech_lead creates the design; the architect implements it.

## Changes to ARCHITECTURE.md

### 1. Update Module Structure Section

Replace the current module structure with:

```markdown
## Module Structure

### agentic-core (`packages/agentic-core/`)
- `src/loop.ts` — generic agent loop (`runAgentLoop()`)
- `src/types.ts` — core interfaces (`Provider`, `ProviderMessage`, `ToolDefinition`, `AgentLoopConfig`, `AgentLoopResult`)
- `src/providers/` — LLM provider adapters
  - `anthropic.ts` — Anthropic Claude adapter
  - `openai.ts` — OpenAI-compatible adapter
  - `index.ts` — `createProvider()` factory

### agentic-lite (`.`)
- `src/index.ts` — public exports
- `src/ask.ts` — thin integration layer (<100 lines): composes agentic-core + tools
- `src/types.ts` — tool-specific interfaces (`AgenticConfig`, `AgenticResult`, `ToolName`)
- `src/tools/` — tool implementations
  - `search.ts` — web search (Tavily/Serper)
  - `code.ts` — code execution (quickjs/pyodide)
  - `file.ts` — file read/write (via agentic-filesystem)
  - `shell.ts` — shell commands (via agentic-shell, Node.js only)
```

### 2. Update Data Flow Section

```markdown
## Data Flow

```
ask(prompt, config) [agentic-lite]
  → buildToolDefs(config.tools)
  → buildToolExecutor(config)           // closure over tool implementations
  → runAgentLoop({                      // agentic-core
       provider: createProvider(config),
       prompt, systemPrompt, toolDefs,
       executeToolCall: toolExecutor,
     })
       → provider.chat(messages, toolDefs, system)
       → if stopReason === 'tool_use':
           executeToolCall(toolCalls)   // callback provided by agentic-lite
           append results to messages
       → return AgentLoopResult
  → map to AgenticResult with tool-specific accumulators
```
```

### 3. Update Dependencies Section (new)

```markdown
## Dependencies

```
agentic-lite
  ├── agentic-core    (loop, providers, types)
  ├── agentic-filesystem (file tool)
  ├── agentic-shell   (shell tool)
  ├── quickjs-emscripten (code tool)
  └── pyodide         (code tool)
```

agentic-core has zero runtime dependencies (uses only fetch).
```

### 4. Update Key Interfaces Section

Add `AgentLoopConfig` and `AgentLoopResult` to the interfaces list. Note that `Provider` and `ToolDefinition` now live in agentic-core.

### 5. Remove Duplicate Content

Lines 56-75 of current ARCHITECTURE.md contain duplicate/instructional text. Remove these.

## Steps

1. Read current ARCHITECTURE.md
2. Update Module Structure section with agentic-core + agentic-lite split
3. Update Data Flow section with new call chain
4. Add Dependencies section
5. Update Key Interfaces to note agentic-core ownership
6. Remove duplicate/instructional content at end of file
7. **Submit as CR** (tech_lead → architect): Write CR to `.team/change-requests/cr-{timestamp}.json` proposing these changes

## Dependencies

- Depends on task-1775613090477 (refactoring must be complete for accurate docs)

## Acceptance

- ARCHITECTURE.md mentions `packages/agentic-core/` and its responsibilities
- Module structure lists agentic-core (loop, providers, types) and agentic-lite (integration layer, tools)
- Data flow shows agentic-lite importing from agentic-core
- No duplicate/instructional content remains
