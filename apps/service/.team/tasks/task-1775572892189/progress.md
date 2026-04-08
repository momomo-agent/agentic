# Implement CPU profiling instrumentation in runtime pipeline

## Progress

- Added `metrics` Map + accumulation to `endMark()` in `profiler.js`
- Added `getMetrics()` export to `profiler.js`
- Wired `startMark('llm')` / `endMark('llm')` into `llm.js` `chat()` finally block
