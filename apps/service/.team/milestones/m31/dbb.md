# M31 DBB — Detector补全 + Runtime层全实现

## 验收标准

### Runtime层
- [ ] `src/runtime/llm.js` — `chat(messages, options)` 返回 async generator，流式输出；Ollama优先，失败fallback云端
- [ ] `src/runtime/stt.js` — `transcribe(audioBuffer) → Promise<string>`；空buffer抛 `EMPTY_AUDIO`
- [ ] `src/runtime/tts.js` — `synthesize(text) → Promise<Buffer>`；空文本抛 `EMPTY_TEXT`

### 集成验证
- [ ] `node -e "import('./src/runtime/llm.js').then(m=>console.log(typeof m.chat))"` → `function`
- [ ] `node -e "import('./src/runtime/stt.js').then(m=>console.log(typeof m.transcribe))"` → `function`
- [ ] `node -e "import('./src/runtime/tts.js').then(m=>console.log(typeof m.synthesize))"` → `function`
- [ ] 所有 `init()` 无异常（允许adapter fallback到default）
