# Progress: src/runtime/llm.js 实现

## Done
- Changed chat() signature from `(message, options)` to `(messages, options)` accepting messages array directly
- Removed history prepending logic (was: `[...history, { role: 'user', content: message }]`)
- messages array passed directly to chatWithOllama and cloud fallbacks unchanged
