# M30 Technical Design — VAD + CDN真实端点 + HTTPS + 多设备脑状态共享

## 1. VAD自动检测 (task-1775517321148)

新增 `src/ui/client/src/composables/useVAD.js`，修改 `src/ui/client/src/components/PushToTalk.vue`。

VAD使用 Web Audio API AudioWorklet 计算RMS能量阈值，超阈值开始录音，静音1.5s后自动停止并提交STT。

## 2. CDN profiles真实端点 (task-1775517325421)

修改 `src/detector/profiles.js`：默认URL已指向 GitHub raw，需确认无占位符，并支持 `PROFILES_URL` 环境变量覆盖。

## 3. HTTPS/LAN安全访问 (task-1775517330333)

修改 `src/server/cert.js`：持久化证书到 `~/.agentic-service/certs/`，避免每次重新生成。
修改 `src/server/httpsServer.js`：读取持久化证书。

## 4. 多设备脑状态共享 (task-1775517334300)

修改 `src/server/brain.js`：按 sessionId 维护共享 history Map。
修改 `src/server/api.js`：chat 请求传入 sessionId，brain 读写共享 history。
