# Fix TTS runtime test setup — add missing init() call

## Progress

Fixed: test was checking `agentic-voice/*` keys but package.json uses `#agentic-voice/*` prefix. Updated test to use correct keys. 7 passed, 0 failed.
