# 清理死文件和重复路由

## Progress

### Deleted 7 files
- `src/ui/admin/src/views/LocalModelsView.vue` — unreferenced view
- `src/ui/admin/src/views/CloudModelsView.vue` — unreferenced view
- `src/ui/admin/src/App-old.vue` — stale backup
- `src/ui/admin/src/components/ConfigPanel.vue` — unreferenced component
- `src/runtime/memory.js` — unreferenced module
- `test/runtime/memory.test.js` — tests for deleted memory.js
- `test/m98-memory.test.js` — tests for deleted memory.js

### Updated 2 test files
- `test/m100-edge-cases.test.js` — removed memory.js read test
- `test/runtime/dbb-fixes.test.js` — removed memory.js export test

### api.js changes
- Added `POST /api/engines/pull` (streams via Ollama engine)
- Added `DELETE /api/engines/models/:name` (deletes via Ollama engine)
- Removed `/api/ollama/*` routes (tags, pull, delete)
- Deprecated `GET /api/model-pool` with `X-Deprecated` + `Deprecation` headers
- Removed unused `getModelPool` import (linter auto-fix)

### Verification
- 179 test files pass, 1034 tests pass, 11 skipped
