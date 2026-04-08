# M93: PRD Partial Gap Closure — STT/TTS, Wake Word, Cloud Fallback

## Goals
Close remaining PRD partial gaps to push match from 78% toward 90%+.

## Scope
1. Verify agentic-voice (STT/TTS) is installed and functional end-to-end
2. Verify wake word server-side mic capture pipeline is wired (not stub)
3. Verify cloud fallback (OpenAI/Anthropic) is reachable and tested
4. Verify npx entrypoint completeness

## Acceptance Criteria
- agentic-voice resolves in test environment (no import errors)
- sense.js startWakeWordPipeline() is not a stub — real mic/audio path exists or is documented as intentional
- Cloud fallback test passes with mocked OpenAI/Anthropic responses
- npx agentic-service --help exits 0

## Blocked By
m91 and m92 must complete first (test pass rate >=90% confirmed).
