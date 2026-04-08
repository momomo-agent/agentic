# Design — Expand README with API docs and usage examples

## File to modify
- `README.md`

## Required sections (verify each exists, add if missing)

### 1. Quick Start
- Code block showing `import { ask } from 'agentic-lite'` with `provider`, `apiKey`, `tools`

### 2. ask() signature
- `ask(prompt: string, config: AgenticConfig): Promise<AgenticResult>`
- Document `prompt` and `config` params, return type

### 3. AgenticConfig fields
All must appear: `provider`, `apiKey`, `model`, `baseUrl`, `customProvider`, `systemPrompt`, `tools`, `filesystem`, `toolConfig`

### 4. AgenticResult fields
All must appear: `answer`, `sources`, `images`, `codeResults`, `files`, `shellResults`, `toolCalls`, `usage`

### 5. Tool descriptions
All must appear: `code_exec`, `shell_exec`, `file_read`, `file_write`, `search`

## Edge cases
- Do not duplicate existing content — read README first, only add missing sections
- Keep existing quick start if already correct

## Test cases (maps to DBB)
- DBB-001: `npm install agentic-lite` present
- DBB-002: code block with `ask(` and `provider`
- DBB-003: `ask`, `prompt`, `config`, `AgenticResult` present
- DBB-004: all AgenticConfig field names present
- DBB-005: all AgenticResult field names present
- DBB-006: all 5 tool names present
