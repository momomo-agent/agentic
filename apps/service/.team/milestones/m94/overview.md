# M94: Architecture Doc Merge + Voice Latency Verification + Remaining PRD Gaps

## Goal
Close remaining architecture and vision gaps to push Vision 72% → 90%+ and Architecture 88% → 90%+.

## Scope
1. Get pending Architecture CR reviewed and merged (tunnel, CLI, HTTPS, VAD, embed, store, matcher/ollama docs)
2. Verify voice latency <2s end-to-end benchmark (STT+LLM+TTS pipeline)
3. Verify remote profiles CDN fallback and agentic-store integration are complete

## Acceptance Criteria
- CR-1775569100684 reviewed and ARCHITECTURE.md updated with all undocumented modules
- Voice latency benchmark passes <2s end-to-end on target hardware
- CDN fallback test passes when primary CDN is unreachable
- agentic-store init() + query() work end-to-end in test environment
- Vision match ≥90%, Architecture match ≥90%

## Blocked By
M91 (architecture CR submission + test pass rate), M92 (Docker/README + test verification), M93 (STT/TTS + wake word + cloud fallback verification)

## Priority
P0 — final push to reach Vision ≥90% and PRD ≥90% targets
