# 语音端到端延迟基准测试

## Progress

- `scripts/benchmark.js` existed; fixed `chat()` call to match actual signature: `chat(text)` with `chunk.content` extraction
- Measures STT, LLM, TTS stages individually; prints JSON with per-stage and total ms
- Exits 0 if total < 2000ms, else exits 1
- Uses silence buffer as STT input; falls back to 'hello' if STT returns empty
