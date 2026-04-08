# Task Design: CDN profiles.json cache staleness check (7-day refresh)

## Analysis

`src/detector/profiles.js` already implements 7-day staleness:
- `CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000`
- `isCacheExpired(timestamp)` checks `Date.now() - timestamp > CACHE_MAX_AGE`
- `saveCache()` stores `{ data, timestamp: Date.now() }`
- `loadCache()` returns `{ data, timestamp }` from `~/.agentic-service/profiles.json`

This task is **verification only** — confirm the existing logic is correct and add unit tests.

## Files to Modify

- `test/detector/profiles.test.js` — add staleness tests

## Test Cases

```js
// Mock fs.readFile to return cache with old timestamp
it('re-fetches when cache is older than 7 days', async () => {
  const oldTimestamp = Date.now() - 8 * 24 * 60 * 60 * 1000;
  // mock loadCache → { data: cachedData, timestamp: oldTimestamp }
  // mock fetch → returns freshData
  // assert fetch was called, saveCache called with freshData
});

it('uses cache without fetch when cache is fresh', async () => {
  const freshTimestamp = Date.now() - 1 * 24 * 60 * 60 * 1000;
  // mock loadCache → { data: cachedData, timestamp: freshTimestamp }
  // assert fetch was NOT called
});

it('falls back to expired cache if re-fetch fails', async () => {
  const oldTimestamp = Date.now() - 8 * 24 * 60 * 60 * 1000;
  // mock loadCache → expired cache
  // mock fetch → throws
  // assert returns cachedData (no crash)
});
```

## Edge Cases
- No cache file: falls through to remote fetch, then builtin default
- Network timeout: `AbortSignal.timeout(5000)` already set
