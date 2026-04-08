# Task Design: llm.js硬件自适应 — 接入optimizer输出

## File to Modify
- `src/runtime/llm.js`

## Current State
`loadConfig()` calls `getProfile(hardware)` from `profiles.js`, which already calls `matchProfile`. The model is dynamically selected — **no hardcoded model exists in llm.js**. The issue to verify: confirm `config.llm.model` is used everywhere (not a hardcoded string).

## Verification Step
Before coding, grep for any hardcoded model strings in `llm.js`:
```
grep -n 'gemma\|gpt-4\|claude' src/runtime/llm.js
```

## If hardcoded model found
Replace with `config.llm.model` from `loadConfig()`.

## If no hardcoded model (likely)
`loadConfig()` already wires `profiles.js → matchProfile → hardware-based model`. No code change needed — task is to confirm and document.

## Current `loadConfig` flow (already correct)
```js
async function loadConfig() {
  if (_config) return _config
  const hardware = await detectHardware()       // detector/hardware.js
  const profile = await getProfile(hardware)    // detector/profiles.js → matchProfile
  _config = { ...profile, _hardware: hardware }
  return _config
}
```
`chatWithOllama` uses `config.llm.model` — fully adaptive.

## Edge Cases
- `getProfile` throws: caught by outer try/catch in `chat()`, falls back to cloud
- Profile returns no `llm.model`: `chatWithOllama` will fail → cloud fallback triggers

## Test Cases (DBB-008, DBB-009)
- Apple Silicon 16GB → profile returns `gemma3:4b` → Ollama request uses that model
- Low-memory system → profile returns smaller model → different from high-memory system
- `optimizer.getProfile` mock returns `{ llm: { model: 'test-model' } }` → `chatWithOllama` uses `test-model`
