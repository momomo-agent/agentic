# M103 — 稳定性与生产就绪

## 目标
健康检查、ARCHITECTURE.md 清理、错误格式统一、音频格式校验

## 范围
- 健康检查端点 (`GET /api/health`) 返回组件状态
- ARCHITECTURE.md 清理：删除已移除文件/组件的引用（memory.js, ConfigPanel, LocalModels/CloudModels）
- OpenAI 兼容错误格式补全：error response 添加 `code` 字段
- 音频格式校验：`/v1/audio/transcriptions` 在传入 STT 前校验文件格式

## 验收标准
- `GET /api/health` 返回 JSON，包含 ollama/stt/tts 状态
- ARCHITECTURE.md 不再引用已删除的文件或组件
- 所有 API 错误响应包含 `{ error: { message, type, code } }`
- 无效音频文件返回 4xx 而非 500
- 所有现有测试继续通过
