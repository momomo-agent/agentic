# Task Design: 请求队列 + 并发控制 (queue.js)

**Task ID:** task-1775896028470
**Module:** Server (ARCHITECTURE.md §3)
**Module Design:** `.team/designs/server.design.md`

## Files to Create

### `src/server/queue.js` (NEW)

## Files to Modify

### `src/server/api.js`
- Import queue functions
- Wrap `/v1/chat/completions` and `/api/chat` with queue
- Add `GET /api/queue/stats` route

## Function Signatures

```javascript
// src/server/queue.js

/**
 * @typedef {{ maxConcurrency: number, maxQueueSize: number }} QueueOptions
 * @typedef {{ pending: number, active: number, maxConcurrency: number, maxQueueSize: number }} QueueStats
 */

export function createQueue(name, options = {})
// Creates a named queue with concurrency control
// options: { maxConcurrency: 1, maxQueueSize: 100 }
// Returns: { enqueue, getStats }

export function enqueue(queue, fn)
// Adds fn to queue, returns Promise that resolves when fn completes
// If queue full: throws { status: 429, retryAfter: estimated_seconds }

export function getQueueStats(queue)
// Returns QueueStats: { pending, active, maxConcurrency, maxQueueSize }
```

### Internal Design

```javascript
// Each queue is a plain object:
const queue = {
  name: string,
  maxConcurrency: number,
  maxQueueSize: number,
  active: 0,
  pending: [],  // Array<{ fn, resolve, reject }>
};

function processNext(queue) {
  if (queue.active >= queue.maxConcurrency || queue.pending.length === 0) return;
  queue.active++;
  const { fn, resolve, reject } = queue.pending.shift();
  fn().then(resolve, reject).finally(() => {
    queue.active--;
    processNext(queue);
  });
}
```

### Integration with api.js

```javascript
// In api.js — imports
import { createQueue, enqueue, getQueueStats } from './queue.js';

// After imports, before addRoutes:
const localQueue = createQueue('local', { maxConcurrency: 1, maxQueueSize: 50 });
const cloudQueue = createQueue('cloud', { maxConcurrency: 5, maxQueueSize: 100 });

// Helper to pick queue based on resolved model
function getQueueForModel(resolved) {
  if (!resolved) return localQueue;  // default to local
  return resolved.engineId.startsWith('cloud:') ? cloudQueue : localQueue;
}
```

### Route Changes

#### `POST /v1/chat/completions` (line ~160 in api.js)
- After model resolution, before calling `chat()`:
```javascript
const queue = getQueueForModel(resolved);
try {
  await enqueue(queue, async () => {
    // existing chat logic
  });
} catch (err) {
  if (err.status === 429) {
    res.set('Retry-After', String(err.retryAfter));
    return apiError(res, 429, 'Too many requests', 'rate_limit_error', 'queue_full');
  }
  throw err;
}
```

#### `POST /api/chat` (SSE endpoint)
- Same pattern as above

#### `GET /api/queue/stats`
```javascript
r.get('/api/queue/stats', (_req, res) => {
  res.json({
    local: getQueueStats(localQueue),
    cloud: getQueueStats(cloudQueue),
  });
});
```

## Step-by-Step Implementation

1. Create `src/server/queue.js` with `createQueue`, `enqueue`, `getQueueStats`
2. In `src/server/api.js`:
   a. Add import: `import { createQueue, enqueue, getQueueStats } from './queue.js';`
   b. Create queue instances after imports (module level)
   c. Add `getQueueForModel()` helper
   d. Wrap `/v1/chat/completions` handler body in `enqueue()`
   e. Wrap `/api/chat` handler body in `enqueue()`
   f. Add `GET /api/queue/stats` route
3. Write tests

## Test Cases

```javascript
// tests/server/queue.test.js
// Test 1: createQueue returns object with correct defaults
// Test 2: enqueue executes fn and returns result
// Test 3: concurrency=1 serializes execution (second fn waits for first)
// Test 4: queue full throws { status: 429, retryAfter }
// Test 5: getQueueStats returns correct counts during execution
// Test 6: concurrent enqueues respect maxConcurrency limit
```

## ⚠️ Unverified Assumptions

- The `/v1/chat/completions` handler uses streaming (SSE). The queue must hold the slot for the entire stream duration, not just the initial request. The `enqueue(fn)` pattern handles this because `fn` returns a Promise that resolves when the stream ends.
- The `/api/chat` endpoint also streams. Same consideration applies.
- `retryAfter` estimation: `pending.length * avgResponseTime / maxConcurrency`. Since we don't track avg response time initially, use a fixed estimate of 5 seconds.
