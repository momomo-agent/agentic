# M7 Technical Design - 云端回退 + 设备协调 + DBB修复 + 文档

## Overview
M7 closes gaps identified in previous milestones: cloud LLM fallback (Anthropic support), WebSocket device coordination, bug fixes from DBB review, and user documentation.

## Tasks

### task-1775495670314: 云端 LLM 回退
- Extend `src/runtime/llm.js` to support Anthropic as fallback provider
- Add `chatWithAnthropic(messages, model)` async generator
- `chat()` reads config.fallback.provider and routes to correct cloud provider

### task-1775495680384: WebSocket 设备协调
- Extend `src/server/hub.js` with WebSocket server (ws library)
- Handle register/ping/pong messages, heartbeat timeout cleanup
- Add `sendToDevice(id, msg)` and capture response routing

### task-1775495680417: DBB 规范修复
- Fix `del()` → `delete()` in store usage
- Fix tool_use response format in `src/server/brain.js`
- Add SIGINT handler in `bin/agentic-service.js`
- Fix CDN URL in `src/detector/profiles.js`
- Add progress display in Ollama model pull

### task-1775495680445: 用户文档 README
- Write `README.md` with install guide, API reference, config docs
