# OpenAI 兼容错误格式 — 添加 code 字段

## Progress

### Implementation Complete
- Added `apiError()` helper in `src/server/api.js` (line 19-21)
- Converted all 8 OpenAI-compatible error responses to use `apiError()` with `code` field
- Updated `src/server/middleware.js` errorHandler to return `{ error: { message, type, code } }`
- Admin/internal routes and Anthropic endpoint left as-is (out of scope per design)

### Tests — All 5 passing
- `test/server/m103-error-format.test.js`: DBB-004, DBB-006, audio transcriptions, audio speech, embeddings

### Notes
- 11 pre-existing audio transcription tests fail due to audio validation (task-1775893487853), not this task
