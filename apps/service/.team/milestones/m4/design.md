# M4 Technical Design — 向量嵌入 + 设备管理

## Overview

M4 adds four capabilities:
1. `src/runtime/embed.js` — vector embedding via agentic-embed
2. `src/store/index.js` — SQLite-backed KV store via agentic-store
3. `src/server/hub.js` — device registry + GET /api/status devices field
4. `src/server/brain.js` — tool_use support in /api/chat

## Dependencies

- `agentic-embed` — bge-m3 embedding model
- `agentic-store` — SQLite/IndexedDB/memory KV abstraction
- `agentic-core` — existing LLM engine (already used in llm.js)

## Integration Points

- `api.js` imports hub.js for `/api/status` devices field
- `api.js` imports brain.js for `/api/chat` tool_use support
- `brain.js` imports embed.js and store.js for tool implementations

## Task Execution Order

1. task-1775493437268 (embed.js) — no deps
2. task-1775493442807 (store/index.js) — no deps
3. task-1775493442855 (hub.js) — no deps
4. task-1775493442904 (brain.js) — depends on embed + store
