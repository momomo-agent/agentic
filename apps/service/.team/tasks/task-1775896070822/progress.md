# 修复 /api/health 响应结构 — 嵌套 components

## Progress

- Nested `ollama`, `stt`, `tts` under `components` in `GET /api/health` response (api.js line 134)
- Updated test assertions in `m103-health.test.js` to use `body.components.*`
- Verified admin UI uses `/api/status` not `/api/health` — no UI changes needed
- All 4 health tests pass
