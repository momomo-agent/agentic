# M25 DBB — Ollama自动安装 + 服务端感知路径

## task-1775513780215: Ollama自动安装

- [ ] `runSetup()` 检测 Ollama 是否已安装（`which ollama`）
- [ ] 未安装时自动执行平台对应安装命令（macOS: brew/curl；Linux: curl）
- [ ] 安装后自动 `ollama pull <profile.llm.model>`，ora spinner 显示进度
- [ ] 已安装但模型缺失时仅 pull，不重复安装
- [ ] 失败时打印错误并以非零码退出

## task-1775513784884: sense.js服务端无头模式

- [ ] 导出 `initHeadless(options?)` — 不依赖 videoElement/requestAnimationFrame
- [ ] 导出 `detectFrame(buffer: Buffer): SenseResult` — 接受原始帧 Buffer
- [ ] 原有 `init(videoElement)` / `start()` / `stop()` 接口保持不变
- [ ] Node.js 环境调用 `detectFrame` 不抛出 DOM 相关错误
