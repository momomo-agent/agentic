# Design: SIGINT graceful drain during in-flight requests

## Goal
SIGINT handler must wait for in-flight requests to complete before process exit.

## Acceptance Criteria
- Process does not exit while a request is being processed
- After all in-flight requests complete, process exits cleanly
- If drain exceeds timeout (e.g. 10s), force exit with code 1

## Approach
1. Track in-flight request count with a counter
2. On SIGINT: stop accepting new requests, wait for counter to reach 0
3. Add timeout fallback calling `process.exit(1)`

## Files
- `src/server/api.js` or equivalent server entrypoint
