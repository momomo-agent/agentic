# Design: brain.js tool_use 响应格式修复

## File to Modify

- `src/server/brain.js`

## Change

When yielding a `tool_use` chunk, include a `text` field (empty string if none):

```javascript
// Before
yield { type: 'tool_use', id: ..., name: ..., input: ... };

// After
yield { type: 'tool_use', id: ..., name: ..., input: ..., text: '' };
```

This applies to both the Ollama path and the OpenAI fallback path wherever `tool_use` is yielded.

## Edge Cases

- `text` defaults to `''` — never `null` or `undefined`
- Content chunks (`type: 'content'`) are unaffected

## Test Cases (DBB)

- DBB-003: LLM returns tool_use → yielded object contains `text` field (string)
