# Task Design: 重试机制 (ollama.js + cloud.js)

**Task ID:** task-1775896028509
**Module:** Engine (ARCHITECTURE.md §2)
**Module Design:** `.team/designs/engine.design.md`

## Files to Modify

### `src/engine/ollama.js`
- Wrap `run()` method with retry logic

### `src/engine/cloud.js`
- Wrap `run()` method with retry logic (inside `createCloudEngine`)

## Design

### Retry Helper (inline in each file)

```javascript
/**
 * Retry wrapper for async generator functions
 * @param {() => AsyncGenerator} fn - generator factory
 * @param {object} opts
 * @param {number} opts.maxRetries
 * @param {(err: Error) => boolean} opts.shouldRetry
 * @param {(err: Error, attempt: number) => number} opts.getDelay - returns ms
 * @param {string} opts.engineName - for logging
 */
async function* withRetry(fn, { maxRetries, shouldRetry, getDelay, engineName }) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      yield* fn();
      return;
    } catch (err) {
      lastError = err;
      if (attempt > maxRetries || !shouldRetry(err)) throw err;
      const delay = getDelay(err, attempt);
      console.log(`[retry] engine=${engineName} attempt=${attempt + 1} reason=${err.message}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}
```

### ollama.js Changes

```javascript
// In the default export object, modify run():
async *run(modelName, input) {
  yield* withRetry(
    () => this._runInner(modelName, input),
    {
      maxRetries: 1,
      shouldRetry: (err) => {
        // Retry on timeout (AbortError) or connection failure
        return err.name === 'AbortError'
          || err.name === 'TypeError'  // fetch connection failure
          || err.message?.includes('ECONNREFUSED');
      },
      getDelay: () => 1000,  // fixed 1s
      engineName: 'ollama',
    }
  );
}
```

- Rename current `run()` to `_runInner()` (private, not exported)
- New `run()` wraps `_runInner()` with `withRetry()`
- Only retry timeout/connection errors, NOT HTTP 4xx/5xx from Ollama

### cloud.js Changes

```javascript
// Inside createCloudEngine(), modify run():
async *run(modelName, input) {
  yield* withRetry(
    () => this._runInner(modelName, input),
    {
      maxRetries: 3,
      shouldRetry: (err) => {
        const status = err.httpStatus;
        return status === 429 || (status >= 500 && status < 600);
      },
      getDelay: (err, attempt) => {
        if (err.httpStatus === 429 && err.retryAfter) {
          return err.retryAfter * 1000;  // Retry-After is in seconds
        }
        // Exponential backoff for 5xx: 1s, 2s, 4s
        return 1000 * Math.pow(2, attempt - 1);
      },
      engineName: `cloud:${provider}`,
    }
  );
}
```

- Rename current `run()` to `_runInner()`
- In `_runInner()`, modify error throwing to include HTTP status:
  ```javascript
  if (!res.ok) {
    const err = new Error(`Cloud chat error: ${res.status}`);
    err.httpStatus = res.status;
    const retryAfter = res.headers.get('Retry-After');
    if (retryAfter) err.retryAfter = parseInt(retryAfter, 10);
    throw err;
  }
  ```
- Apply same pattern to all `!res.ok` checks in `_runInner()` (STT, TTS, embedding, chat)

## Step-by-Step Implementation

1. **ollama.js:**
   a. Add `withRetry()` helper function at top of file (after imports)
   b. Rename `run` to `_runInner` in the default export object
   c. Add new `run` that wraps `_runInner` with `withRetry()`

2. **cloud.js:**
   a. Add `withRetry()` helper function at top of file (after imports)
   b. Inside `createCloudEngine()` returned object:
      - Rename `run` to `_runInner`
      - Modify all `throw new Error(...)` in `_runInner` to include `httpStatus` and `retryAfter`
      - Add new `run` that wraps `_runInner` with `withRetry()`

3. Write tests

## Test Cases

```javascript
// tests/engine/retry.test.js (or split into ollama.test.js / cloud.test.js)

// Test 1: ollama run() retries once on AbortError, succeeds on second attempt
// Test 2: ollama run() does NOT retry on HTTP 400 (non-retryable)
// Test 3: cloud run() retries on 429 with Retry-After header
// Test 4: cloud run() retries on 500 with exponential backoff (1s, 2s, 4s)
// Test 5: cloud run() gives up after maxRetries (3) and throws last error
// Test 6: retry logs include engine name and attempt number
```

## ⚠️ Unverified Assumptions

- `withRetry` wrapping an async generator: if the generator has already yielded some values before failing, retry will re-yield from the beginning. For streaming chat, this means the caller might receive duplicate content chunks. This is acceptable because:
  - Ollama timeout happens on first token (5s timeout), so no content has been yielded yet
  - Cloud 429/5xx typically happens before any SSE data is sent
  - If partial data was sent, the retry will produce a new stream — caller (api.js) is already writing to res, so this could cause issues. Mitigation: buffer all yields and only forward after successful completion? No — that defeats streaming. Accept the edge case: if error happens mid-stream, the retry will produce garbled output. This is rare and acceptable for M103.
