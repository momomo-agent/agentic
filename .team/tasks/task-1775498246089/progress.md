# agentic-sense 视觉感知

## Progress

- Rewrote `src/runtime/sense.js` with event-driven API: `init/on/start/stop`
- Uses `createPipeline` from agentic-sense, rAF loop, filters objects with confidence <= 0.5
- Assumption: `createPipeline` is async and returns object with `detect(video)` method
