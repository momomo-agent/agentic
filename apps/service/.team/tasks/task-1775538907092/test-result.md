# Test Result: Fix TTS import paths to use package.json imports map

## Status: PASSED

## Tests Run
`node test/m43-agentic-voice.test.js`

## Results
- 10 passed, 0 failed

## Details
- ✓ package.json imports map covers all agentic-voice subpaths
- ✓ all adapter files exist
- ✓ openai-whisper exports transcribe()
- ✓ openai-tts exports synthesize()
- ✓ transcribe throws NO_API_KEY without OPENAI_API_KEY
- ✓ synthesize throws NO_API_KEY without OPENAI_API_KEY
- ✓ stub adapters export correct function signatures
- ✓ tts.synthesize throws "not initialized" before init()
- ✓ tts.synthesize works after init()
- ✓ tts.synthesize throws EMPTY_TEXT for empty input

## Verification
Import paths in `src/runtime/tts.js` correctly use `#agentic-voice/*` aliases, resolving via package.json imports map. DBB criterion 1 satisfied.
