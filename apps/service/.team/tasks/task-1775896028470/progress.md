# 请求队列 + 并发控制 (queue.js)

## Progress

- Created `src/server/queue.js` with createQueue, enqueue, getQueueStats
- localQueue (concurrency=1, size=50) for local/ollama models
- cloudQueue (concurrency=5, size=100) for cloud models
- Wrapped `/v1/chat/completions` and `/api/chat` with enqueue() — queue slot held for entire stream duration
- Queue selection: model name containing 'cloud:' → cloudQueue, else localQueue
- 429 response with Retry-After header when queue is full
- Added `GET /api/queue/stats` route
- 7 tests in test/server/queue.test.js — all passing
