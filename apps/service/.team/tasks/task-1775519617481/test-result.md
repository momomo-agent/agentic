# Test Result: src/runtime/tts.js

## Summary
- Total: 12 | Passed: 12 | Failed: 0

## Results (tester-1)
- ✔ exports init and synthesize
- ✔ synthesize before init throws "not initialized"
- ✔ blank text throws EMPTY_TEXT with code
- ✔ whitespace-only text is guarded via trim()
- ✔ adapter map includes kokoro, piper, default openai-tts
- ✔ init falls back to default on adapter load failure

## Results (tester-2: m38-runtime.test.js)
- ✔ throws "not initialized" before init()
- ✔ valid text → Buffer after init()
- ✔ empty string → EMPTY_TEXT error
- ✔ whitespace-only → EMPTY_TEXT error
- ✔ unknown provider falls back to openai-tts
- ✔ piper provider uses piper adapter
