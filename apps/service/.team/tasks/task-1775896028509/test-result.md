# Test Result: 重试机制 (ollama.js + cloud.js)

**Task ID:** task-1775896028509
**Tester:** tester
**Date:** 2026-04-11

## Summary

All tests PASS. The retry mechanism is correctly implemented in both ollama.js and cloud.js.

## Test Files
- `test/engine/retry.test.js` (developer-written): 6 tests, 6 passed
- `test/engine/retry-edge.test.js` (tester-written): 9 tests, 9 passed

## Test Results

| # | Test | Result |
|---|------|--------|
| 1 | ollama: retries once on AbortError, succeeds on second attempt | PASS |
| 2 | ollama: does NOT retry on HTTP 400 (non-retryable) | PASS |
| 3 | ollama: retries on ECONNREFUSED | PASS |
| 4 | ollama: retries on TypeError (connection failure) | PASS |
| 5 | ollama: logs retry with correct format | PASS |
| 6 | ollama: maxRetries=1 means at most 2 total attempts | PASS |
| 7 | cloud: retries on 429 with Retry-After header | PASS |
| 8 | cloud: retries on 500 with exponential backoff | PASS |
| 9 | cloud: gives up after maxRetries (3) and throws last error | PASS |
| 10 | cloud: does NOT retry on 400 (non-retryable) | PASS |
| 11 | cloud: does NOT retry on 401 (authentication error) | PASS |
| 12 | cloud: does NOT retry on 403 (forbidden) | PASS |
| 13 | cloud: retries on 503 (service unavailable) | PASS |
| 14 | cloud: error includes httpStatus and retryAfter from response | PASS |
| 15 | cloud: logs retry with correct format: engine=cloud:<provider> | PASS |

**Total: 15 passed, 0 failed**

## DBB Coverage

- DBB-011 (existing tests pass): Verified
- Retry on timeout/connection (ollama): Verified
- Retry on 429 with Retry-After (cloud): Verified
- Retry on 5xx with exponential backoff (cloud): Verified
- 4xx errors NOT retried: Verified (400, 401, 403)
- Max 3 retries for cloud, 1 for ollama: Verified
- Logging format `[retry] engine=xxx attempt=N reason=xxx`: Verified

## Edge Cases Identified

- Mid-stream retry (error after partial yield) could produce duplicate chunks — documented as acceptable in design
- No cap on Retry-After value — large values could cause long waits
- ollama maxRetries is 1 (not 3 as in task description) — matches design.md specification
