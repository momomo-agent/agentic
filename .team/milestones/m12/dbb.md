# M12 DBB — Ollama自动安装 + STT/TTS完善 + 用户文档

## DBB-001: Ollama 自动安装
- setup.js 检测 Ollama 未安装时自动执行安装命令（非仅打印）
- 安装完成后自动拉取推荐模型，进度输出到 stdout
- 安装失败时输出明确错误信息并退出非零码

## DBB-002: STT transcribe
- stt.js transcribe(audioBuffer) 返回 string（非空 Buffer 输入）
- 本地 SenseVoice 不可用时自动回退云端（OpenAI Whisper）
- 回退路径抛出错误时 reject Promise

## DBB-003: TTS synthesize
- tts.js synthesize(text) 返回 Buffer（非空字符串输入）
- 本地 Kokoro 不可用时自动回退云端（OpenAI TTS）
- 回退路径抛出错误时 reject Promise

## DBB-004: README 完整性
- README.md 包含：安装（npx/全局/Docker）、配置、API 端点列表、Docker 部署示例
