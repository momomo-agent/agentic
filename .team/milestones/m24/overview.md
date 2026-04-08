# M24: HTTPS安全访问 + 语音延迟基准 + 服务端唤醒词 + npx入口

## Goals
Close remaining vision/PRD gaps after M23.

## Tasks
1. HTTPS/LAN tunneling — wire httpsServer.js into startup, enable secure multi-device access
2. Voice latency <2s benchmark — add e2e STT+LLM+TTS timing assertion in tests
3. Server-side always-on wake word — integrate wake word detection into hub.js (not just UI)
4. npx entrypoint + CDN URL fix — real npx bin entry, replace cdn.example.com placeholder

## Acceptance Criteria
- `npm start` serves HTTPS on LAN with self-signed cert
- Test suite asserts voice pipeline latency <2000ms
- hub.js listens for wake word without browser client
- `npx agentic-service` works; profiles CDN URL is non-placeholder

## Blocked By
M23 tasks must be done before this milestone activates.
