# M3 Done-By-Definition (DBB)

## STT 运行时
- [ ] `src/runtime/stt.js` 导出 `transcribe(audioBuffer) → Promise<string>`
- [ ] `POST /api/transcribe` 接受 multipart audio，返回 `{ text: string }`
- [ ] 音频为空/格式不支持返回 400
- [ ] agentic-voice 不可用时抛出明确错误

## TTS 运行时
- [ ] `src/runtime/tts.js` 导出 `synthesize(text) → Promise<Buffer>`
- [ ] `POST /api/synthesize` 接受 `{ text }`，返回 audio/wav 二进制
- [ ] text 为空返回 400
- [ ] agentic-voice 不可用时抛出明确错误

## Admin 管理面板
- [ ] `/admin` 展示硬件信息（platform, arch, gpu, memory）
- [ ] `/admin` 展示当前 profile（llm, stt, tts）
- [ ] `/admin` 展示服务日志（最近 50 条）
- [ ] 数据来自 `GET /api/status` 和 `GET /api/config`

## 测试
- [ ] STT/TTS 单元测试（mock agentic-voice）
- [ ] `/api/transcribe` 和 `/api/synthesize` 集成测试
