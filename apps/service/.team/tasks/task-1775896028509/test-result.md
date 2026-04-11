# Test Result: 重试机制 (ollama.js + cloud.js)

**Task ID:** task-1775896028509
**Tester:** tester
**Date:** 2026-04-11

## Summary

All tests PASS. The retry mechanism is correctly implemented in both ollama.js and cloud.js.

## Test Results

| # | Test | Result |
|---|------|--------|
| 1 | ollama: succeeds on first attempt without retry | ✅ PASS |
| 2 | ollama: retries once on AbortError and succeeds | ✅ PASS |
| 3 | ollama: does NOT retry on non-retryable error (HTTP 400) | ✅ PASS |
| 4 | ollama: retries on ECONNREFUSED | ✅ PASS |
| 5 | ollama: retries on TypeError (fetch connection failure) | ✅ PASS |
| 6 | ollama: gives up after maxRetries (1) | ✅ PASS |
| 7 | ollama: yields all chunks on successful first attempt | ✅ PASS |
| 8 | cloud: retries on 429 and succeeds | ✅ PASS |
| 9 | cloud: retries on 500 with exponential backoff | ✅ PASS |
| 10 | cloud: gives up after maxRetries (3) and throws | ✅ PASS |
| 11 | cloud: does NOT retry on 400 (client error) | ✅ PASS |
| 12 | cloud: does NOT retry on 401 (auth error) | ✅ PASS |
| 13 | cloud: does NOT retry on 403 (forbidden) | ✅ PASS |
| 14 | cloud: does NOT retry on 404 (not found) | ✅ PASS |
| 15 | cloud: uses Retry-After value for 429 delay | ✅ PASS |
| 16 | cloud: uses exponential backoff for 5xx | ✅ PASS |
| 17 | source: ollama.js contains withRetry | ✅ PASS |
| 18 | source: cloud.js contains withRetry | ✅ PASS |
| 19 | source: cloud.js attaches httpStatus | ✅ PASS |
| 20 | source: cloud.js reads Retry-After header | ✅ PASS |
| 21 | source: retry logging format correct | ✅ PASS |

**Total: 21 passed, 0 failed**

## DBB Coverage

- DBB-011 (existing tests pass): ✅ Verified
- Retry on timeout/connection (ollama): ✅ Verified
- Retry on 429 with Retry-After (cloud): ✅ Verified
- Retry on 5xx with exponential backoff (cloud): ✅ Verified
- 4xx errors NOT retried: ✅ Verified
- Max 3 retries for cloud, 1 for ollama: ✅ Verified
- Logging format [retry] engine=xxx attempt=N reason=xxx: ✅ Verified

## Edge Cases Identified

- Mid-stream retry (error after partial yield) could produce duplicate chunks — documented as acceptable in design
- ollama maxRetries is 1 (not 3 as in task description) — matches design.md specification
