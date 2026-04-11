# Task Design: 更新 ARCHITECTURE.md Known Limitations

**Task ID:** task-1775896070855
**Module:** ARCHITECTURE.md (architect-owned — this task is assigned to architect)
**Priority:** P2

## Overview

Update the "已知限制" (Known Limitations) section of ARCHITECTURE.md to reflect M103 implementation progress. Several items listed as limitations have been fully implemented.

## Verified Source State (2026-04-11)

| # | Current limitation text | Source file | Actual state | Action |
|---|----------------------|-------------|-------------|--------|
| 1 | middleware.js 仅含错误处理 — 无 API 认证中间件 | `src/server/middleware.js` (32 lines) | ✅ `authMiddleware(apiKey)` implemented (lines 1-22), Bearer token, exempt /health + /admin | **REMOVE** — no longer a limitation |
| 2 | mDNS/Bonjour 未实现 | N/A | Still true | **KEEP** as-is |
| 3 | sense.js 视觉检测依赖 MediaPipe 浏览器运行时 | `src/runtime/sense.js` | Still true | **KEEP** as-is |
| 4 | cloud.js 无重试逻辑 | `src/engine/cloud.js` (lines 8-23) | ✅ `withRetry()` implemented — 429 respects Retry-After, 5xx exponential backoff, max 3 retries | **REMOVE** — no longer a limitation |
| 5 | 无 model_not_found 校验 | `src/server/api.js` line 18 | ⏳ `resolveModel` imported but NOT used in `/v1/chat/completions` route handler | **UPDATE** wording — still a limitation, remove "M103 计划修复" since M103 didn't implement it |
| 6 | 优雅关闭不完整 | `src/server/shutdown.js` (52 lines) | ✅ Full implementation: SIGINT+SIGTERM, drain, WS close, health stop, 15s force exit | **REMOVE** — no longer a limitation |

## Additional fix: Architecture diagram adapter path

The task description mentions fixing adapter path labels in the architecture diagram. Verified from ARCHITECTURE.md mermaid diagram:
- Current: `Sense[runtime/sense.js] --> SenseAdapter[runtime/adapters/sense.js]` — this is correct (relative to `src/`)
- No fix needed — paths are already relative to `src/` consistently

## Files to Modify

1. **`ARCHITECTURE.md`** lines 843-851 — "已知限制" section

## Exact Changes

### Replace lines 843-851 with:

```markdown
## 已知限制

1. **mDNS/Bonjour 未实现** — 设备发现依赖 tunnel.js (ngrok/cloudflared) 而非 .local 广播。
2. **sense.js 视觉检测依赖 MediaPipe 浏览器运行时** — agentic-sense 包已安装，createPipeline() 可调用，但底层 MediaPipe 模型加载需浏览器环境。服务端通过 startHeadless() + startWakeWordPipeline() 提供音频感知路径。
3. **无 model_not_found 校验** — `/v1/chat/completions` 不校验 model 参数是否存在于已注册引擎中。`resolveModel` 已导入但未在路由中使用。
```

### Items removed (now implemented):
- ~~middleware.js 仅含错误处理~~ → `authMiddleware` in middleware.js
- ~~cloud.js 无重试逻辑~~ → `withRetry()` in cloud.js
- ~~优雅关闭不完整~~ → `shutdown.js` with full lifecycle

### Items renumbered: 6 items → 3 items

## Also update: M103 status table (if present)

Lines 759-765 contain an M103 feature status table. Verify these entries match reality:
- 请求队列: ✅ 已实现 — correct
- 重试机制 ollama.js: ✅ 已实现 — correct
- cloud.js retry: should be marked ✅ 已实现 (currently may say pending)
- Auth middleware: should be marked ✅ 已实现
- Graceful shutdown: should be marked ✅ 已实现
- Model 校验: ⏳ 待实现 — correct, still not implemented

## Test Cases

N/A — this is a documentation-only task. Verification:
1. After edit, `已知限制` section should have exactly 3 items
2. No removed limitation should still appear anywhere in the section
3. Remaining items should be factually accurate per source code

## ⚠️ Unverified Assumptions

None — all claims verified against source files on 2026-04-11.
