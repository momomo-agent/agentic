# Task Design: Remove stale ARCHITECTURE.md known limitation #4

**Task:** task-1775848127948
**Module:** ARCHITECTURE.md (architect-owned)
**Status:** Already resolved — no code changes needed

## Verification

The limitation #4 ("根 Dockerfile EXPOSE 3000 — 应为 1234") has already been removed from ARCHITECTURE.md.

**Current state (ARCHITECTURE.md lines 496-500):**
```
## 已知限制

1. middleware.js 仅含错误处理 — 无请求验证、速率限制或安全中间件
2. adapters/embed.js 是死代码 — 抛出 'not implemented'
3. mDNS/Bonjour 未实现 — 设备发现依赖 tunnel.js
```

Only 3 limitations remain. #4 about Dockerfile EXPOSE 3000 is gone.

**Dockerfile verification (line 13):** `EXPOSE 1234` — correct.

## Action Required

None. Architect should mark this task as `done` since the limitation was already removed in a prior commit.

## Test Cases

- DBB-003 already covers Docker port 1234 verification
- Visual inspection of ARCHITECTURE.md confirms no stale Dockerfile limitation
