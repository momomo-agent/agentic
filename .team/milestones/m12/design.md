# M12 Technical Design — Ollama自动安装 + STT/TTS完善 + 用户文档

## 任务概览
1. Ollama 自动安装执行（task-1775500429396）
2. STT/TTS 完整性修复（task-1775500434960）
3. 用户文档 README（task-1775500439158）

## 依赖
- src/detector/hardware.js — 硬件检测
- src/runtime/stt.js, tts.js — 语音运行时
- agentic-voice — STT/TTS 底层
