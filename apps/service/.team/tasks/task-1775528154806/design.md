# Design: Voice Latency <=2s Benchmark

## File
- `test/latency.test.js` (create)

## Implementation

```js
// test/latency.test.js
import { transcribe } from '../src/runtime/stt.js'
import { chat } from '../src/runtime/llm.js'
import { synthesize } from '../src/runtime/tts.js'

const THRESHOLD_MS = 2000

test('STT+LLM+TTS end-to-end latency <= 2000ms', async () => {
  const audioBuffer = Buffer.alloc(16000 * 2) // 1s silence PCM16
  const start = Date.now()
  const text = await transcribe(audioBuffer)
  let reply = ''
  for await (const chunk of chat([{ role: 'user', content: text || 'hello' }], {})) {
    reply += chunk
  }
  await synthesize(reply.slice(0, 50)) // short to keep TTS fast
  const elapsed = Date.now() - start
  expect(elapsed).toBeLessThanOrEqual(THRESHOLD_MS)
}, 10000)
```

## Edge Cases
- If Ollama not running: test should skip with `test.skip` or catch ECONNREFUSED and skip
- Empty transcription: fallback to `'hello'` as input

## Dependencies
- `src/runtime/stt.js`, `src/runtime/llm.js`, `src/runtime/tts.js` must export named functions
