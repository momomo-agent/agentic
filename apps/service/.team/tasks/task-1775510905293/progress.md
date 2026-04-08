# 修复 src/detector/profiles.js

## Progress

Verified: `getProfile(hardware)` works correctly via `matchProfile`. Fixed `profiles/default.json` profile[3]: moved llm/stt/tts/fallback under `config` key, set provider to `openai`. All profiles tests pass (3/3 + 14/14 + 6/6).
