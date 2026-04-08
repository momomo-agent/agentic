# Design: 语音端到端延迟基准测试

## Files to Create
- `scripts/benchmark.js`

## Function Signatures
```js
// Main entry
async function main(): Promise<void>

// Stage runners
async function runSTT(audioBuffer: Buffer): Promise<{ text: string, ms: number }>
async function runLLM(text: string): Promise<{ reply: string, ms: number }>
async function runTTS(text: string): Promise<{ audio: Buffer, ms: number }>
```

## Algorithm
1. Load a short test audio sample (or generate silence buffer as STT input)
2. `t0 = Date.now()` → call STT → `sttMs = Date.now() - t0`
3. `t1 = Date.now()` → call LLM with transcribed text → `llmMs = Date.now() - t1`
4. `t2 = Date.now()` → call TTS with LLM reply → `ttsMs = Date.now() - t2`
5. Print JSON: `{ stt: sttMs, llm: llmMs, tts: ttsMs, total: sttMs+llmMs+ttsMs }`
6. Exit 0 if total < 2000, else exit 1

## Dependencies
- `src/runtime/stt.js` — `transcribe(buffer)`
- `src/runtime/llm.js` — `chat(messages, options)` (collect full stream)
- `src/runtime/tts.js` — `synthesize(text)`

## Edge Cases
- If any runtime not configured → print error, exit 1
- LLM stream: collect all chunks before measuring end time
