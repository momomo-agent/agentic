# Test Result: src/runtime/stt.js

## Summary
- Total: 6 | Passed: 6 | Failed: 0

## Results
- ✔ exports init and transcribe
- ✔ transcribe before init throws "not initialized"
- ✔ transcribe with null buffer throws EMPTY_AUDIO
- ✔ transcribe with empty buffer (length 0) throws EMPTY_AUDIO
- ✔ adapter map includes sensevoice, whisper, default
- ✔ init falls back to default on adapter load failure

## Notes
- Test file: test/runtime/m38-stt.test.js
