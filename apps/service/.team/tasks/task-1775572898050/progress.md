# Expose performance metrics via /api/perf endpoint

## Progress

- Added `import { getMetrics }` from profiler.js to api.js
- Added `GET /api/perf` route returning `getMetrics()` as JSON
