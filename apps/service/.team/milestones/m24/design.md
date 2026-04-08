# M24 技术设计 — HTTPS安全访问 + 语音延迟基准 + 服务端唤醒词 + npx入口

## 目标
完善生产就绪能力：双协议服务、延迟验证、服务端语音激活、npx分发。

## 任务概览

### T1: HTTPS/LAN安全访问
修改 `src/server/api.js` 的 `startServer()`，当 `options.https=true` 时额外创建 HTTPS 服务器监听 port+443（默认3443），复用同一 express app。

### T2: 语音延迟基准
新增 `test/latency.test.js`，用 vi.fn() mock STT/LLM/TTS，记录各阶段耗时，断言总和 < 2000ms。

### T3: 服务端唤醒词
在 `src/server/hub.js` 添加 `startWakeWordDetection(keyword)`，使用 `readline` 或 stdin 模拟（无硬件依赖），检测到关键词时调用 `broadcast({ type: 'wake' })`。

### T4: npx入口 + CDN修正
确认 `package.json` bin 字段已存在（已有），修正 `src/detector/profiles.js` 中硬编码的 cdn.example.com 为 GitHub raw URL，并支持 `PROFILES_URL` 环境变量覆盖。
