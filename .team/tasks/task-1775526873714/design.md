# Design: PRD.md

## File to create
`PRD.md` at project root

## Sections
1. **Overview** — what agentic-lite is, target users
2. **Agent Loop** — multi-round tool use via `ask(prompt, config)`
3. **Tools** — search, code, file (read/write)
4. **Provider Config** — anthropic/openai/custom, apiKey, model, baseUrl
5. **AgenticResult** — answer, sources, images, codeResults, files, toolCalls, usage

## Test Cases
- File exists at `PRD.md`
- Contains keywords: `file_read`, `file_write`, `code_exec`, `ask`
