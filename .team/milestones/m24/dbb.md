# M24 DBB — HTTPS安全访问 + 语音延迟基准 + 服务端唤醒词 + npx入口

## 验收标准

### 1. HTTPS/LAN安全访问接入
- [ ] `startServer(port, { https: true })` 同时启动 HTTP (port) 和 HTTPS (port+443)
- [ ] 局域网设备可通过 `https://<LAN-IP>:3443` 访问
- [ ] 自签名证书由 `cert.js` 生成

### 2. 语音端到端延迟 < 2s
- [ ] `test/latency.test.js` 存在并通过
- [ ] 断言 STT + LLM + TTS 全链路耗时 < 2000ms
- [ ] `npm test` 全部通过

### 3. 服务端常驻唤醒词检测
- [ ] `hub.js` 导出 `startWakeWordDetection(keyword)`
- [ ] 检测到唤醒词时 WebSocket 广播 `{ type: 'wake' }`
- [ ] 支持 `WAKE_WORD` 环境变量配置

### 4. npx入口 + CDN URL修正
- [ ] `package.json` bin 字段正确指向 `bin/agentic-service.js`
- [ ] `npx agentic-service` 可直接运行
- [ ] `profiles.js` CDN URL 使用真实 GitHub raw URL 或 `PROFILES_URL` 环境变量
