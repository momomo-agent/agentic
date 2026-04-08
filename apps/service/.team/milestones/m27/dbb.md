# M27 DBB - Runtime续 + Server层核心

## DBB-001: stt.js transcribe() 返回文本
- Given: 初始化 stt runtime，传入有效 audioBuffer 调用 transcribe()
- Expect: 返回非空字符串
- Verify: typeof result === 'string' && result.length > 0

## DBB-002: stt.js transcribe() 空 buffer 报错
- Given: 传入空 Buffer 或长度为 0 的 audioBuffer
- Expect: 抛出 code === 'EMPTY_AUDIO' 的错误

## DBB-003: tts.js synthesize() 返回 audioBuffer
- Given: 初始化 tts runtime，传入非空文本调用 synthesize()
- Expect: 返回 Buffer 或 Uint8Array，length > 0

## DBB-004: tts.js synthesize() 空文本报错
- Given: 传入空字符串
- Expect: 抛出 code === 'EMPTY_TEXT' 的错误

## DBB-005: sense.js detectFrame() 返回结构化结果
- Given: 调用 initHeadless()，传入 frame buffer 调用 detectFrame()
- Expect: 返回 { faces: [], gestures: [], objects: [] } 结构

## DBB-006: sense.js detectFrame() 未初始化时返回空结果不抛异常
- Given: 未调用 init/initHeadless，直接调用 detectFrame()
- Expect: 返回 { faces: [], gestures: [], objects: [] }

## DBB-007: memory.js add() + search() 端到端
- Given: add('test memory text')，再 search('test memory')
- Expect: results[0].text === 'test memory text', score > 0

## DBB-008: hub.js registerDevice() + getDevices()
- Given: registerDevice('dev-1', { name: 'test' })
- Expect: getDevices().find(d => d.id === 'dev-1') 非 null

## DBB-009: brain.js chat() 返回 AsyncGenerator
- Given: Ollama 运行中，chat([{ role: 'user', content: 'hi' }])
- Expect: for-await 可迭代，至少一个 { type: 'content', text } chunk

## DBB-010: POST /api/chat 返回 SSE 流
- Given: POST /api/chat { message: 'hello' }
- Expect: Content-Type: text/event-stream，响应包含 'data:'

## DBB-011: GET /api/status 返回硬件和设备信息
- Given: GET /api/status
- Expect: JSON 包含 hardware、profile、devices 字段

## DBB-012: profiles/default.json 包含 cpu-only fallback profile
- Given: 读取 profiles/default.json
- Expect: 存在 match 为空对象的 fallback，llm.model 为轻量 CPU 可运行模型
