# Design: brain.js tool_use 响应补充 text 字段

## File
`src/server/brain.js`

## Analysis
Both yield sites already include `text: ''`:
- Ollama path: `yield { type: 'tool_use', ..., text: '' }`
- OpenAI path: `yield { type: 'tool_use', ..., text: '' }`

No code change required.

## Test Cases (DBB-003)
```js
for await (const chunk of chat(messages, { tools })) {
  if (chunk.type === 'tool_use') {
    assert('text' in chunk); // must exist, even if ''
  }
}
```
