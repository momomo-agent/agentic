# M29 Technical Design

## 目标
完善安装流程、服务端唤醒词、语音延迟基准、用户文档。

## 模块分工

### 1. Ollama自动安装 (task-1775516741858)
- `src/cli/setup.js` 新增 `ensureOllama(profile)` — 检测+安装+拉取模型
- 平台判断：darwin用brew/curl，linux用curl，win32提示手动安装

### 2. setup.sh + npx入口 (task-1775516748193)
- `install/setup.sh` 改为完整curl-pipe脚本：检测Node、npm install -g、启动
- `package.json` 确认 `bin.agentic-service` 指向 `bin/agentic-service.js`

### 3. 服务端唤醒词 (task-1775516748230)
- `src/runtime/sense.js` 新增 `startWakeWord(keyword, onDetected)` — 服务端audio stream检测
- `src/server/api.js` 启动时调用，检测到后通过hub广播 `{type:'wake_word'}`

### 4. 语音延迟基准 (task-1775516748265)
- `test/benchmark/voice-latency.js` — 串联mock STT/LLM/TTS，计时10次取p50/p95/max
- 结果写入 `test/benchmark/results.json`

### 5. README文档 (task-1775516748300)
- 更新 `README.md`：安装/API/Docker/配置/故障排查各节
