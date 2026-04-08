# M21 Technical Design: Detector完善 + Admin路由 + 架构对齐

## T1: src/detector/profiles.js
Already implemented. `getProfile(hardware)` delegates to `matchProfile` from `matcher.js`.
No changes needed — verify existing implementation passes DBB-001 and DBB-002.

## T2: src/detector/optimizer.js
Currently contains Ollama setup logic but is named `optimizer.js`.
Architecture expects `optimizer.js` to export optimization utilities.
Fix: rename internal concern or re-export `setupOllama` so import path matches ARCHITECTURE.md.

## T3: src/ui/client/ Admin路由
Add vue-router to client app. Route `/` → ChatBox, `/admin` → iframe or redirect to admin SPA.
Minimal: serve admin SPA at `/admin` via server static mount; client just links to it.

## Dependencies
- T1 is independent (verify only)
- T2 is independent
- T3 depends on M20 task-1775510291601 (admin SPA must exist)
