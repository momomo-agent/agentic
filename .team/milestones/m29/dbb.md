# M29 DBB — Done-By-Definition

## task-1775516741858: Ollama自动安装 + 模型拉取
- [ ] `src/cli/setup.js` `ensureOllama()` 检测binary，缺失时自动下载安装
- [ ] 安装后执行 `ollama pull <model>`，显示进度
- [ ] 安装失败输出错误并以非0退出
- [ ] 单元测试覆盖：已安装/未安装/拉取失败

## task-1775516748193: setup.sh完善 + npx入口验证
- [ ] `install/setup.sh` 支持 `curl -fsSL <url> | sh` 一键安装
- [ ] 检测 Node ≥18，缺失时给出安装提示
- [ ] `npx agentic-service` 可直接启动（package.json bin字段正确）

## task-1775516748230: 服务端唤醒词常驻pipeline
- [ ] `src/runtime/sense.js` 导出 `startWakeWord(keyword, onDetected)`
- [ ] server启动时调用，检测到唤醒词后广播 WebSocket 事件 `wake_word`
- [ ] SIGINT时pipeline正确停止
- [ ] 单元测试：mock pipeline，验证事件触发

## task-1775516748265: 语音延迟<2s端到端基准
- [ ] `test/benchmark/voice-latency.js` 可独立运行
- [ ] 测量 STT→LLM→TTS 端到端延迟，输出 p50/p95/max
- [ ] p95 ≤ 2000ms（mock adapter）
- [ ] 输出 `test/benchmark/results.json`

## task-1775516748300: README用户文档补全
- [ ] 包含：安装（npx/全局/Docker）、API端点示例、配置、故障排查
- [ ] 每个API端点有请求/响应示例
- [ ] Docker部分包含完整 `docker run` 命令
