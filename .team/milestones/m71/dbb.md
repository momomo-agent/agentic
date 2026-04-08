# M71 DBB — Server-Side VAD + Optimizer + cpu-only Profile

## task-1775528326243: Server-side VAD silence suppression
- [ ] `POST /api/transcribe` calls `detectVoiceActivity(buffer)` before STT
- [ ] Silent audio returns `{ text: '', skipped: true }` without calling `stt.transcribe()`
- [ ] Non-silent audio passes through to STT normally
- [ ] `detectVoiceActivity` uses RMS energy threshold (0.01)

## task-1775528897750: optimizer.js hardware-adaptive config
- [ ] `optimize(hardware)` returns `{ threads, memoryLimit, model, quantization }`
- [ ] apple-silicon → `{ threads: 8, model: 'gemma4:26b', quantization: 'q8' }`
- [ ] nvidia → `{ threads: 4, model: 'gemma4:13b', quantization: 'q4' }`
- [ ] cpu-only → `{ threads: cpu.cores, model: 'gemma2:2b', quantization: 'q4' }`
- [ ] No Ollama setup code in optimizer.js

## task-1775528904107: cpu-only profile in profiles/default.json
- [ ] Entry with `"match": { "gpu": "none" }` exists in profiles array
- [ ] Specifies `llm.model: "gemma2:2b"`, `llm.quantization: "q4"`
- [ ] Includes stt, tts, and fallback fields
