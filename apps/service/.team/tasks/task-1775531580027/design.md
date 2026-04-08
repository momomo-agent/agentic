# Design: Voice Latency Benchmark

## File
`src/server/api.js` — wrap the voice pipeline endpoint

## Implementation

In the POST `/api/transcribe` + `/api/synthesize` chain (or wherever STT→LLM→TTS is called end-to-end):

```js
const t0 = Date.now();
const text = await transcribe(audioBuffer);          // STT
const reply = await collectStream(chat([{role:'user', content: text}])); // LLM
const audio = await synthesize(reply);               // TTS
const ms = Date.now() - t0;
console.log(`[voice] latency: ${ms}ms`);
if (ms > 2000) console.error(`[voice] LATENCY EXCEEDED: ${ms}ms`);
```

## Function Signatures
- `transcribe(audioBuffer: Buffer): Promise<string>` — from `src/runtime/stt.js`
- `chat(messages: Array): AsyncGenerator` — from `src/server/brain.js`
- `synthesize(text: string): Promise<Buffer>` — from `src/runtime/tts.js`

## Edge Cases
- Latency measured wall-clock; network/model load included
- Log only, no throw — service continues even if threshold exceeded

## Test Cases
- Latency logged on each voice request
- Log line contains "LATENCY EXCEEDED" when >2000ms
