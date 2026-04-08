# Design: Create ARCHITECTURE.md

## File to Create
- `ARCHITECTURE.md` (repo root)

## Content Outline
1. Overview — what agentic-lite is
2. Module Structure — list of `src/` files and their roles
3. Key Interfaces — `AgenticConfig`, `AgenticResult`, `Provider`, `ToolDefinition`
4. Data Flow — `ask()` loop: prompt → provider.chat → tool execution → repeat until final answer
5. Provider Resolution — anthropic/openai/custom fallback logic
6. Tool System — search/code/file/shell tool names and what each does

## Algorithm
- Read existing source files (ask.ts, types.ts, providers/, tools/) to extract accurate info
- Write prose + code snippets matching actual implementation

## Edge Cases
- Must reflect actual interface shapes (usage required, images string[])

## Test Cases
- File exists at `ARCHITECTURE.md`
- Contains sections: Overview, Module Structure, Key Interfaces, Data Flow, Provider Resolution
