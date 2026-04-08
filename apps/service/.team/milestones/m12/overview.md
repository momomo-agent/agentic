# M12: Ollama自动安装 + STT/TTS完善 + 用户文档

## Goals
- Ollama 首次启动自动执行安装并拉取模型（非仅打印命令）
- STT/TTS 完整实现验证，云端回退路径可用
- README 用户文档覆盖安装/配置/API/Docker

## Tasks
- task-1775500429396: Ollama 自动安装执行 (P1)
- task-1775500434960: STT/TTS 完整性修复 (P1)
- task-1775500439158: 用户文档 README (P2)

## Acceptance Criteria
- `npx agentic-service` 首次运行自动安装 Ollama 并拉取模型，显示进度
- `stt.js transcribe()` 和 `tts.js synthesize()` 端到端测试通过
- README.md 包含快速开始、API 参考、Docker 部署三节

## Gaps Addressed
- PRD: M1 one-click install (missing)
- PRD: M2 STT/TTS integration (partial)
- PRD: M4 user documentation (missing)
- Vision: Ollama auto-download (partial)
