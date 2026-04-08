# Test Results: 基础 HTTP 服务

## Summary
- **Total**: 11 | **Passed**: 11 | **Failed**: 0
- **Status**: PASS

## Test Results

### POST /api/chat
- ✅ returns 400 for missing message
- ✅ returns 400 for non-string message
- ✅ returns SSE stream with content-type text/event-stream
- ✅ streams chunks in SSE format and ends with [DONE]
- ✅ passes history to chat function
- ✅ writes error chunk on chat failure

### GET /api/status
- ✅ returns hardware, profile, ollama fields
- ✅ hardware contains required fields (platform, arch, gpu, memory, cpu)

### GET /api/config
- ✅ returns 200 with object

### PUT /api/config
- ✅ echoes back the body

### startServer
- ✅ resolves with a server instance

## Known Bug (non-blocking)
`startServer` uses a module-level Express `app` singleton. When a raw `net.Server` holds a port, `startServer` still resolves successfully instead of rejecting with EADDRINUSE. The port-in-use error handling in the design is not fully functional due to the shared app instance. This is an implementation bug but does not affect core chat/status/config functionality.

## Edge Cases Identified
- Empty history array (default) — handled correctly
- LLM error during streaming — error chunk written, stream ends cleanly
- EADDRINUSE detection broken due to module-level app singleton (bug)
- `/api/status` ollama fields are hardcoded stubs (`installed: true, models: []`) — not real detection
- `/api/config` GET/PUT are stubs (no persistence)
