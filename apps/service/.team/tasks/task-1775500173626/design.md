# Design: optimizer → llm.js 硬件自适应接线

## Files
- `src/runtime/llm.js` — modify `loadConfig()`
- `src/detector/hardware.js` — already exports `detect()`
- `src/detector/profiles.js` — already exports `getProfile(hardware)`

## Change to loadConfig()
```js
import { detect as detectHardware } from '../detector/hardware.js'
import { getProfile } from '../detector/profiles.js'

async function loadConfig() {
  const hardware = await detectHardware()
  const profile = await getProfile(hardware)
  return {
    llm: profile.llm,
    fallback: profile.fallback
  }
}
```

## Notes
- `getProfile()` already handles remote fetch + cache + fallback to built-in
- `profile.llm` shape: `{ provider, model, quantization? }` — `chatWithOllama` only uses `config.llm.model`, compatible
- Cache `loadConfig()` result per process lifetime to avoid repeated hardware detection:

```js
let _config = null
async function loadConfig() {
  if (_config) return _config
  const hardware = await detectHardware()
  _config = await getProfile(hardware)
  return _config
}
```

## Edge Cases
- `detectHardware()` throws: let it propagate (caller already has try/catch for Ollama fallback)
- `getProfile()` falls back to built-in default.json — always returns a valid config

## Test Cases
1. Mock hardware `{ gpu: { type: 'apple-silicon' }, memory: 32 }` → model !== 'gemma4:26b' hardcoded
2. Mock hardware `{ gpu: { type: 'none' }, memory: 8 }` → smaller model selected
3. `loadConfig()` called twice → `detectHardware()` called only once (cache hit)
