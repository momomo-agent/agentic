# Design: Verify and Fix Cloud Fallback in llm.js

## Files to Verify/Modify
- `src/runtime/llm.js` — fallback path already exists; verify and fix gaps

## Current Fallback Flow (llm.js `chat()`)
1. Try `chatWithOllama()` — if throws, catch and warn
2. Load `config.fallback.{ provider, model }`
3. Check API key presence, throw descriptive error if missing
4. Emit `{ type: 'meta', provider: 'cloud' }` chunk
5. Delegate to `chatWithOpenAI` or `chatWithAnthropic`

## Gaps to Fix
- `chatWithOllama` uses `AbortSignal.timeout(30000)` — connection refused throws immediately, so fallback triggers correctly. Verify `fetch` to `localhost:11434` when Ollama is down throws a network error (not a non-error response).
- Ensure `record('llm_total', ...)` in `finally` block does not double-record on fallback path (currently it does — `record` is called in `finally` regardless; acceptable since it measures wall time).
- Confirm `config.fallback` is always present in `default.json` profile.

## Files to Check
- `profiles/default.json` — must have `fallback: { provider, model }`
- `src/detector/profiles.js` — `getProfile()` must always return a `fallback` key

## Test Cases
- Mock `fetch` to throw `ECONNREFUSED` for Ollama URL → fallback provider stream returned
- `OPENAI_API_KEY` unset with openai provider → throws `'OPENAI_API_KEY not set'`
- `ANTHROPIC_API_KEY` unset with anthropic provider → throws `'ANTHROPIC_API_KEY not set'`
- `{ type: 'meta', provider: 'cloud' }` is first yielded chunk on fallback
