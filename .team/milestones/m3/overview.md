# M3: 语音能力 + 管理面板

## 目标
实现 STT/TTS 语音运行时，补全 /api/transcribe 和 /api/synthesize 端点，并构建 /admin 管理面板。

## 范围
- `src/runtime/stt.js` — 封装 agentic-voice STT，transcribe(audioBuffer) → text
- `src/runtime/tts.js` — 封装 agentic-voice TTS，synthesize(text) → audioBuffer
- `/api/transcribe` + `/api/synthesize` 端点接入真实 runtime
- `src/ui/admin/` — 管理面板：硬件信息、配置、日志

## 验收标准
- POST /api/transcribe 接受音频返回文字
- POST /api/synthesize 接受文字返回音频
- /admin 页面展示硬件检测结果和当前配置
- 所有新端点有测试覆盖
