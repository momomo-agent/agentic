# M81: Voice Latency Benchmark + npx Entrypoint — Technical Design

## Voice Latency Benchmark

**File:** `test/benchmark/voice-latency.test.js`

```javascript
import { describe, it, expect } from 'vitest';
import { transcribe } from '../src/runtime/stt.js';
import { chat } from '../src/runtime/llm.js';
import { synthesize } from '../src/runtime/tts.js';

describe('Voice Latency Benchmark', () => {
  it('should complete STT+LLM+TTS in under 2 seconds', async () => {
    const audioBuffer = loadTestAudio('test-input.wav');

    const start = Date.now();

    // STT
    const text = await transcribe(audioBuffer);

    // LLM
    const response = await chat([{ role: 'user', content: text }]);

    // TTS
    const audio = await synthesize(response);

    const latency = Date.now() - start;

    console.log(`Voice latency: ${latency}ms`);
    expect(latency).toBeLessThan(2000);
  });
});
```

**Production Logging:** Add to `src/server/api.js`:
```javascript
app.post('/api/voice', async (req, res) => {
  const start = Date.now();
  // ... process voice request
  const latency = Date.now() - start;
  console.log(`[VOICE] Latency: ${latency}ms`);
  if (latency > 2000) {
    console.warn(`[VOICE] Latency exceeded threshold: ${latency}ms`);
  }
});
```

## npx Entrypoint

**File:** `package.json`
```json
{
  "bin": {
    "agentic-service": "./bin/agentic-service.js"
  }
}
```

**File:** `bin/agentic-service.js` (verify shebang and permissions)
```javascript
#!/usr/bin/env node
import { startService } from '../src/index.js';
startService();
```

## External Package Wiring

**File:** `src/runtime/embed.js`
```javascript
import { embed } from 'agentic-embed';

export async function embedText(text) {
  return await embed(text, { model: 'bge-m3' });
}
```

**File:** `src/runtime/sense.js`
```javascript
import { detectFace, detectGesture, detectObject } from 'agentic-sense';

export async function detectFaces(imageData) {
  return await detectFace(imageData);
}
// ... similar for gesture and object
```

**File:** `package.json`
```json
{
  "dependencies": {
    "agentic-embed": "^1.0.0",
    "agentic-sense": "^1.0.0"
  },
  "imports": {
    "#agentic-embed": "./node_modules/agentic-embed/index.js",
    "#agentic-sense": "./node_modules/agentic-sense/index.js"
  }
}
```

## README Documentation

**Sections to add/verify:**
1. Installation: `npx agentic-service`
2. Docker: `docker run -p 3000:3000 momomo/agentic-service`
3. API Endpoints: `/api/chat`, `/api/transcribe`, `/api/synthesize`, `/api/status`
4. Hardware Requirements: GPU types, memory, CPU specs
