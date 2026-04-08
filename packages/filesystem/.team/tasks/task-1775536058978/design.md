# Task Design: ShellFS AI Agent Tool Definitions

## File to Create
`src/shell-tools.ts`

## File to Modify
`src/index.ts` — add `export { shellFsTools } from './shell-tools.js'`

## Exported Shape
```ts
export interface ShellTool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, { type: string; description: string }>
    required: string[]
  }
}

export const shellFsTools: ShellTool[]
```

## Tool Definitions

### shell_cat
- description: Read full content of a file
- input: `{ path: string }` (required)

### shell_head
- description: Read first N lines of a file
- input: `{ path: string, lines?: number }` (lines default 10, not required)

### shell_tail
- description: Read last N lines of a file
- input: `{ path: string, lines?: number }` (lines default 10, not required)

### shell_find
- description: List files, optionally filtered by name pattern
- input: `{ path?: string, name?: string }` (neither required)

## Notes
- Pure data export — no imports, no runtime logic
- `input_schema` follows JSON Schema / Anthropic tool-use format
- `head`/`tail` `lines` param is optional (not in `required` array)

## Test Cases
- `shellFsTools` is an array of length 4
- Each entry has `name`, `description`, `input_schema`
- `shell_cat` has `path` in `required`
- `shell_head`/`shell_tail` have `lines` in properties but not in `required`
