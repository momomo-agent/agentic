# Refactor: Delete brain.js, core replaces it

## Goal
brain.js is redundant — core already has provider failover, tool loop, streaming.
Delete brain.js. Service calls core directly.

## Current State
- `api.js` imports `{ chat }` from `brain.js`, calls `chat(messages, { tools })`
- `hub.js` imports `{ chat as brainChat }` from `brain.js`, calls `brainChat(messages, options)`
- `brain.js` imports core, wraps it with engine registry routing + cloud fallback + probing
- core has `agenticAsk()`, `registerProvider()`, provider failover chain

## What to Do

### Step 1: Create `src/server/providers.js` (thin config layer)
This replaces brain.js. It:
- Reads config (ensureConfig, onConfigChange)
- Registers engine registry engines as core providers via `registerProvider()`
- Registers cloud fallback provider
- Sets up cloud mode probing
- Exports `initProviders()` that api.js calls on startup

### Step 2: Create `src/server/core-bridge.js` (the new chat interface)
Simple module that:
- Imports core's agenticAsk
- Exports `chat(messages, options)` async generator that wraps agenticAsk
- Handles the chunk format mapping (core emits text_delta/tool_use, service expects same)
- This is the ONLY file api.js and hub.js import for LLM calls

### Step 3: Update api.js
- Replace `import { chat } from './brain.js'` with `import { chat } from './core-bridge.js'`
- Call `initProviders()` during server startup (in the init/listen section)
- Everything else stays the same — chat() has the same signature

### Step 4: Update hub.js  
- Replace `import { chat as brainChat } from './brain.js'` with `import { chat as brainChat } from './core-bridge.js'`
- Remove session management (sessions Map, joinSession, getSession, setSessionData, getSessionData, broadcastSession with session history)
- Keep: device registry, WebSocket server, handleChat, handleVoiceStream, broadcast, capture
- Session state moves to client side

### Step 5: Delete brain.js

### Step 6: Update tests
- Any test importing brain.js → import core-bridge.js
- Run `npx vitest run apps/service/test/` and fix failures

## Constraints
- Do NOT modify packages/core/agentic-core.js
- chat() output format must stay compatible (type: 'text_delta', 'content', 'tool_use', 'error')
- api.js endpoints must keep working (OpenAI-compatible /v1/chat/completions, /v1/messages, /api/chat)
- hub.js WebSocket protocol must keep working (chat_start, chat_delta, chat_end)
- registerTool from brain.js → move to core-bridge.js (registers in core's toolRegistry)

## Verification
- `npx vitest run apps/service/test/` — no new failures from this change
- grep for 'brain' in apps/service/src/ — should only find comments or none
