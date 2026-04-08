# Design: 云端 LLM 回退 (task-1775495670314)

## Files to Modify
- `src/runtime/llm.js` — add Anthropic fallback

## Changes

### Add `chatWithAnthropic(messages, model)` generator
```js
async function* chatWithAnthropic(messages, model) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  // POST https://api.anthropic.com/v1/messages with stream:true
  // yield { type: 'content', content, done: false }
}
```

### Update `chat()` fallback routing
```js
// After Ollama fails:
const config = await loadConfig();
const { provider, model } = config.fallback;
if (provider === 'openai') yield* chatWithOpenAI(messages, model);
else if (provider === 'anthropic') yield* chatWithAnthropic(messages, model);
else throw new Error(`Unsupported fallback provider: ${provider}`);
```

### Emit provider identifier on fallback
First yield before delegating to cloud:
```js
yield { type: 'meta', provider: 'cloud' };
```

## Edge Cases
- `ANTHROPIC_API_KEY` not set → throw `'ANTHROPIC_API_KEY not set'`
- Unknown provider → throw `'Unsupported fallback provider: <name>'`
- Anthropic API non-200 → throw `'Anthropic API error: <status>'`

## Test Cases
- Ollama down + `OPENAI_API_KEY` set → stream returns content chunks
- Ollama down + `ANTHROPIC_API_KEY` set + fallback.provider='anthropic' → stream returns content chunks
- Ollama down + no API key → error message contains provider name
- First yielded event on fallback has `type: 'meta', provider: 'cloud'`
