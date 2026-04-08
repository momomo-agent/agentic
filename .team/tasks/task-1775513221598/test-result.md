# Test Result: 服务端常驻唤醒词检测

## Summary
- Tests passed: 7
- Tests failed: 0

## Results (m24-wakeword.test.js)
- ✓ exports startWakeWordDetection
- ✓ uses WAKE_WORD env var
- ✓ broadcasts {type: wake} on keyword match
- ✓ skips in non-TTY environment
- ✓ case-insensitive keyword match
- ✓ does not throw in non-TTY env
- ✓ accepts custom keyword

## DBB Verification
- [x] hub.js exports startWakeWordDetection(keyword)
- [x] broadcasts { type: 'wake' } on keyword match
- [x] supports WAKE_WORD env var
- [x] non-TTY safe (Docker/CI)

## Edge Cases
- Empty registry: broadcast is no-op (safe)
- Non-TTY env: returns immediately without error
