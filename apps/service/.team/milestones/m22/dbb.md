# M22 DBB - Runtime层修复 (llm/stt/tts/sense/memory)

## DBB-001: llm.js chat 返回 stream
- Given: 调用 `chat([{ role:'user', content:'hi' }], {})`
- Expect: 返回 AsyncIterable，yield 至少一个 string chunk
- Verify: unit test (mock Ollama HTTP)

## DBB-002: llm.js 云端回退
- Given: Ollama 不可用，调用 `chat(...)`
- Expect: 自动切换到 OpenAI/Anthropic，仍返回 stream
- Verify: unit test (mock Ollama timeout, mock OpenAI response)

## DBB-003: stt.js transcribe 返回文本
- Given: 调用 `transcribe(audioBuffer)`
- Expect: 返回非空 string
- Verify: unit test (mock adapter)

## DBB-004: tts.js synthesize 返回 Buffer
- Given: 调用 `synthesize("hello")`
- Expect: 返回 Buffer，length > 0
- Verify: unit test (mock adapter)

## DBB-005: sense.js start/stop 无异常
- Given: 调用 `start({ face: true })`，再调用 `stop()`
- Expect: 无异常抛出，`isRunning()` 先 true 后 false
- Verify: unit test

## DBB-006: memory.js store + retrieve
- Given: `store("key", "value", embedding)`，再 `retrieve("query", 1)`
- Expect: 返回包含原始 value 的数组
- Verify: unit test (in-memory store)
