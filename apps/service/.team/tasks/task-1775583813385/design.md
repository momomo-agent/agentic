# Design: Verify cloud fallback and npx entrypoint

## Cloud fallback
`src/runtime/llm.js:chat()` already implements fallback (lines 128-143):
- Ollama fetch fails → loads `config.fallback.{provider,model}`
- Routes to `chatWithOpenAI` or `chatWithAnthropic`

### Test approach
```js
// Mock fetch: first call (Ollama) rejects, second call (OpenAI) returns stream
global.fetch = vi.fn()
  .mockRejectedValueOnce(new Error('connection refused'))
  .mockResolvedValueOnce(mockStreamResponse('data: {"choices":[{"delta":{"content":"hi"}}]}\ndata: [DONE]\n'))
process.env.OPENAI_API_KEY = 'test-key'
// Assert: chat() yields { type: 'content', content: 'hi' }
```

## npx entrypoint
File: `bin/agentic-service.js`

### Requirement
`node bin/agentic-service.js --help` must exit 0.

### Fix if needed
Add `--help` flag check at top of bin entry:
```js
if (process.argv.includes('--help')) {
  console.log('Usage: agentic-service [options]')
  process.exit(0)
}
```

## Files to check/modify
- `bin/agentic-service.js` — add --help if missing
- `test/llm.test.js` or `test/cloud-fallback.test.js` — cloud fallback test

## Test cases
- Cloud fallback: Ollama fails → OpenAI chunks yielded
- Cloud fallback: no API key → throws with clear message
- npx: `--help` exits 0
