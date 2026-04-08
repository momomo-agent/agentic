# Test Result: agentic-sense and agentic-voice external package wiring

## Summary
- **18 passed, 0 failed**
- Tested by: tester-2
- Test file: `test/test-package-wiring.js`

## Results
- ✓ package.json has imports map
- ✓ imports map has agentic-sense → ./src/runtime/adapters/sense.js
- ✓ imports map has all agentic-voice/* entries (sensevoice, whisper, openai-whisper, openai-tts, kokoro, piper)
- ✓ src/runtime/sense.js imports from 'agentic-sense'
- ✓ src/runtime/stt.js imports from 'agentic-voice/*'
- ✓ src/runtime/tts.js imports from 'agentic-voice/*'
- ✓ All adapter files exist at mapped paths

## Notes
DBB says "Both packages listed in package.json dependencies" — they are intentionally NOT in `dependencies`; the `imports` map aliases them to local adapters. This is correct per the design doc.

## Edge Cases
- Node `imports` map is package-scoped; dynamic imports only resolve from within the package root
