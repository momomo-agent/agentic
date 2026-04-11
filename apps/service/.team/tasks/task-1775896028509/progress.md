# 重试机制 (ollama.js + cloud.js)

## Progress

- withRetry already implemented in both ollama.js and cloud.js (from prior work)
- ollama.js: 1 retry for AbortError/TypeError/ECONNREFUSED, fixed 1s delay
- cloud.js: 3 retries for 429/5xx, exponential backoff with Retry-After support
- Wrote 8 tests in test/engine-retry.test.js — all passing
