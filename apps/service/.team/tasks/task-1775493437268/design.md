# Design: 向量嵌入运行时

## File
- `src/runtime/embed.js` (create)

## Interface

```js
// embed(text: string) → Promise<number[]>
// Returns float32 vector array. Throws on error.
export async function embed(text) {}
```

## Logic

1. If `text` is empty string → return `[]`
2. Call `agentic-embed` package: `import { embed as agenticEmbed } from 'agentic-embed'`
3. Return the resulting float32 array

## Error Handling
- Empty string → return `[]` (no throw)
- `agentic-embed` throws → propagate with original message

## Edge Cases
- `text` is not a string → throw `TypeError('text must be a string')`
- Result array contains non-finite values → not validated (trust agentic-embed)

## Dependencies
- `agentic-embed` (external package)

## Test Cases (DBB-001, DBB-002)
- `embed("hello world")` → array of finite floats, length > 0
- `embed("")` → `[]`
- `embed(null)` → throws TypeError
