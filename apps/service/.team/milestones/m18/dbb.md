# M18 DBB — Runtime层实现验收标准

## llm.js
- [ ] `chat(messages, options)` 为异步生成器，yield `{ type, content, done }`
- [ ] 本地 Ollama 优先，失败自动切换云端 fallback
- [ ] fallback 时 yield `{ type: 'meta', provider: 'cloud' }`
- [ ] 支持 openai / anthropic fallback provider

## stt.js
- [ ] `init()` 根据 profile 加载 adapter
- [ ] `transcribe(audioBuffer) → Promise<string>`
- [ ] audioBuffer 为空抛出 `{ code: 'EMPTY_AUDIO' }`
- [ ] 未初始化时抛出错误

## tts.js
- [ ] `init()` 根据 profile 加载 adapter
- [ ] `synthesize(text) → Promise<Buffer>`
- [ ] text 为空抛出 `{ code: 'EMPTY_TEXT' }`
- [ ] 未初始化时抛出错误

## sense.js
- [ ] `init(videoElement)` 创建 MediaPipe pipeline
- [ ] `detect(frame) → { faces, gestures, objects }`
- [ ] `start()` / `stop()` 控制轮询
- [ ] `on(type, handler)` 事件订阅
- [ ] pipeline 未初始化时 detect 返回空结果

## memory.js
- [ ] `add(text) → Promise<void>`，串行化并发写入
- [ ] `search(query, topK?) → Promise<{text, score}[]>`，cosine 排序
- [ ] `remove(key)` / `delete(key)` 导出
