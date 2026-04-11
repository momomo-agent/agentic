# Task Design: 修复 /api/health 响应结构 — 嵌套 components

**Task ID:** task-1775896070822
**Module:** Server (ARCHITECTURE.md §3)
**Module Design:** `.team/designs/server.design.md`

## Status: ALREADY IMPLEMENTED

The `/api/health` endpoint in `src/server/api.js` (lines 134-143) already returns the nested `components` structure:

```javascript
res.json({
  status: overall,
  uptime: process.uptime(),
  components: {
    ollama,
    stt: sttStatus,
    tts: ttsStatus,
  },
  responseTime: Date.now() - start,
});
```

This matches the ARCHITECTURE.md specification. The flat structure described in the original task description no longer exists in the codebase.

## Remaining Work

1. Verify existing tests assert on the nested structure (not flat)
2. Verify admin dashboard (`ui/admin/src/views/StatusView.vue`) reads `response.components.ollama` (not `response.ollama`)
3. If tests/UI still reference flat structure, update them

## Test Cases

```javascript
// Test 1: /api/health returns { status, components: { ollama, stt, tts } }
// Test 2: components.ollama.status reflects actual Ollama availability
// Test 3: overall status is 'degraded' when ollama is down
```
