# Test Result: 唤醒词检测

## Status: PASSED

## Tests: 8/8 passed (existing test/ui/wakeword.test.js)

- DBB-001: emits activated when transcript includes wakeWord ✓
- does not emit for non-matching transcript ✓
- DBB-002: works with custom wakeWord ✓
- case-insensitive matching ✓
- empty wakeWord does not start listening ✓
- no SpeechRecognition support: no crash ✓
- onerror retries up to 3 times ✓
- stopListening stops recognition ✓

## File: test/ui/wakeword.test.js
