# Task Design: Add voice adapter API signatures to ARCHITECTURE.md

**Task:** task-1775858361684
**Module:** Runtime（服务运行时） — ARCHITECTURE.md §11 Runtime Adapters
**Module Design:** `.team/designs/runtime.design.md`
**Assignee:** architect (ARCHITECTURE.md is architect-owned)
**Status:** ✅ Already addressed

## Finding

ARCHITECTURE.md §11 (lines 462-489) already contains complete voice adapter API signatures for all 8 adapters:

### STT Adapters (documented)
- `sensevoice.check()` → `Promise<void>`
- `sensevoice.transcribe(buffer)` → `Promise<string>`
- `whisper.check()` → `Promise<void>`
- `whisper.transcribe(buffer)` → `Promise<string>`
- `openaiWhisper.transcribe(buffer)` → `Promise<string>`

### TTS Adapters (documented)
- `kokoro.synthesize(text)` → `Promise<Buffer>`
- `piper.synthesize(text)` → `Promise<Buffer>`
- `openaiTts.synthesize(text)` → `Promise<Buffer>`
- `elevenlabs.synthesize(text)` → `Promise<Buffer>`
- `macosSay.synthesize(text)` → `Promise<Buffer>`
- `macosSay.listVoices()` → `Promise<Array<{name, locale}>>`

### Verification Against Source Code

All signatures verified against actual source files (2026-04-11):

| Adapter | Source Lines | Exports Match ARCHITECTURE.md |
|---------|-------------|-------------------------------|
| sensevoice.js | 21 lines | ✅ check + transcribe |
| whisper.js | 29 lines | ✅ check + transcribe |
| openai-whisper.js | 9 lines | ✅ transcribe |
| kokoro.js | untracked (new) | ✅ synthesize |
| piper.js | 119 lines | ✅ synthesize |
| openai-tts.js | 24 lines | ✅ synthesize |
| elevenlabs.js | 48 lines | ✅ synthesize |
| macos-say.js | 61 lines | ✅ synthesize + listVoices |

## Recommendation

This task can be marked **done** — the voice adapter API signatures are already present in ARCHITECTURE.md §11. No further changes needed.

## No Source Code Changes Required
Documentation-only task, and the documentation already exists.
