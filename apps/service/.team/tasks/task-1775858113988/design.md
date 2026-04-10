# Task Design: Fix missing kokoro.js adapter

**Task:** task-1775858113988
**Module:** Runtime（服务运行时） — ARCHITECTURE.md §3
**Module Design:** `.team/designs/runtime.design.md`

## Problem

`src/runtime/tts.js:9` references `./adapters/voice/kokoro.js` in the ADAPTERS map, but the file does not exist on disk. Kokoro is the **default TTS provider** in:
- `src/config.js:32` — `tts: { provider: 'kokoro', voice: 'default' }`
- `profiles/default.json` — apple-silicon, nvidia, cpu-only, none, default profiles all use kokoro

This means on first run with any hardware profile, `init()` will try to load kokoro, fail, and fall back to `openai-tts` (which requires an API key). The fallback masks the bug but degrades the local-first experience.

## Solution: Create the kokoro adapter

Create `src/runtime/adapters/voice/kokoro.js` following the same pattern as other adapters (piper.js, elevenlabs.js).

### Verified adapter contract (from `src/runtime/tts.js:51-57`)
```javascript
// Adapter must export:
export async function synthesize(text) → Buffer  // audio data
// Optional:
export async function check() → boolean          // reachability check (used by stt.js, not tts.js currently)
```

### Kokoro adapter behavior

Kokoro TTS runs as a local HTTP server (kokoro-tts). The adapter should:

1. Read config from `~/.agentic-service/config.json` for `tts.baseUrl`, `tts.voice` overrides
2. Default base URL: `http://localhost:8880` (standard kokoro-tts port)
3. POST text to the kokoro API endpoint
4. Return audio buffer
5. Throw with descriptive error if kokoro server is not reachable

### File to create

**`src/runtime/adapters/voice/kokoro.js`** (~30 lines)

```javascript
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_PATH = path.join(os.homedir(), '.agentic-service', 'config.json');
const DEFAULT_BASE_URL = 'http://localhost:8880';

export async function synthesize(text) {
  let ttsConfig = {};
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    ttsConfig = JSON.parse(raw).tts || {};
  } catch {}

  const baseUrl = ttsConfig.baseUrl || DEFAULT_BASE_URL;
  const voice = ttsConfig.voice || 'default';

  const res = await fetch(`${baseUrl}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: text, voice }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw Object.assign(
      new Error(`Kokoro TTS failed: ${res.status} ${body}`),
      { code: res.status }
    );
  }

  return Buffer.from(await res.arrayBuffer());
}
```

### Files modified: none

The ADAPTERS map in `src/runtime/tts.js:9` already references `./adapters/voice/kokoro.js` — no changes needed there.

### Test cases

1. **Existing test passes** — `test/runtime/m38-tts.test.js:35-38` checks `src.includes('kokoro')` — already passes since the reference exists in tts.js
2. **Adapter file exists** — `fs.access('src/runtime/adapters/voice/kokoro.js')` should succeed
3. **Adapter exports synthesize** — `import('./adapters/voice/kokoro.js')` should resolve, and `mod.synthesize` should be a function
4. **All existing TTS tests pass** — no regression in stt-tts-adaptive, stt-tts-m12, m38-tts, server/tts tests

### ⚠️ Unverified assumptions

- Kokoro TTS API endpoint is `/v1/audio/speech` with `{ input, voice }` body — this follows the OpenAI-compatible TTS API convention that kokoro-tts implements. If the actual kokoro server uses a different endpoint, the adapter will need adjustment.
- Default port 8880 — this is the standard kokoro-tts default. Configurable via `tts.baseUrl` in config.

### DBB alignment

- **DBB-001**: Kokoro adapter exists → no import error when kokoro selected
- **DBB-002**: All ADAPTERS map entries have corresponding files on disk
- **DBB-004**: No changes to other adapters → no regression
- **DBB-005**: No changes to existing code → all tests pass
