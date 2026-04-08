# 远程 profiles

## Progress

### Implementation Complete
- Created `profiles/default.json` with 3 profile configurations:
  - Apple Silicon (darwin/arm64) → Ollama gemma4:26b
  - Linux NVIDIA → Ollama gemma4:13b
  - Default fallback → OpenAI gpt-4o-mini

- Implemented `src/detector/profiles.js`:
  - Remote fetch with 5s timeout
  - Local cache (~/.agentic-service/profiles.json) with 7-day expiry
  - Fallback chain: fresh cache → remote → expired cache → builtin

- Implemented `src/detector/matcher.js`:
  - Scoring algorithm with weighted criteria (platform:30, gpu:30, arch:20, memory:20)
  - Empty match criteria returns score of 1 (catch-all default)
  - Platform/memory mismatches eliminate candidates

- Created `test/detector/profiles.test.js`:
  - All 3 tests passing
  - Verified Apple Silicon profile matching
  - Verified default fallback for unmatched hardware

### Notes
- Used `AbortSignal.timeout(5000)` instead of deprecated `timeout` option in fetch
- Empty match object `{}` acts as catch-all with score=1, ensuring there's always a match
