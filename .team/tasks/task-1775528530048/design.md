# Design: Voice latency <2s benchmark

## File
`test/latency.test.js` (new)

## Approach
Measure wall-clock time for STT+LLM+TTS pipeline using mock adapters.

```js
import { transcribe } from '../src/runtime/stt.js';
import { chat } from '../src/runtime/llm.js';
import { synthesize } from '../src/runtime/tts.js';

test('voice round-trip < 2s', async () => {
  const start = Date.now();
  const text = await transcribe(mockAudioBuffer);
  const reply = await collectStream(chat([{ role: 'user', content: text }]));
  await synthesize(reply);
  expect(Date.now() - start).toBeLessThan(2000);
});
```

## Edge cases
- Use mock adapters to avoid network calls in CI
- Document actual hardware benchmark result in README
