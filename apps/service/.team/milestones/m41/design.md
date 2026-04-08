# M41 Technical Design

## Goal
Complete Runtime layer (sense, memory) and verify Server layer (hub, brain, api) match architecture contracts. Ensure offline startup via default profile.

## Approach

### sense.js
Current file already has `initHeadless`, `detectFrame`, `startHeadless` — implementation is complete. No changes needed.

### memory.js
Current file already has `add`, `search`, `remove` backed by agentic-store + agentic-embed. No changes needed.

### hub.js
Current file already implements all required exports. No changes needed.

### brain.js
Current file already implements `chat` and `registerTool`. No changes needed.

### api.js
Current file already implements all endpoints and `startServer`. No changes needed.

### profiles/default.json
Already exists with apple-silicon, nvidia, and fallback entries.

## Status
All 5 todo tasks are implementations that already exist in source. Designs confirm the existing code satisfies architecture contracts. Tasks can be marked done after tester verification.
