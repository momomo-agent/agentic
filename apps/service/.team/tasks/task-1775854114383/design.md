# Task Design: Document embed.js and runtime adapters in ARCHITECTURE.md

**Task:** task-1775854114383
**Modules:** Embed (ARCHITECTURE.md §10), Runtime Adapters (ARCHITECTURE.md §11)
**Type:** Documentation only — no code changes

## Current State

ARCHITECTURE.md already contains:
- §10 (lines 447-457): Embed module with `embed(text) → number[]`, agentic-embed import, empty string/TypeError behavior, dead code note for adapters/embed.js
- §11 (lines 461-480): Runtime Adapters with `createPipeline()` for sense.js, dead code note for adapters/embed.js, and all 7 voice adapters listed

## Gap Analysis

### src/runtime/embed.js (9 lines)

| Aspect | ARCHITECTURE.md §10 | Actual Source | Gap |
|--------|---------------------|---------------|-----|
| Export | `embed(text) → number[]` | Same | ✅ None |
| Import | `import { localEmbed } from 'agentic-embed'` | `import agenticEmbedPkg from 'agentic-embed'; const { localEmbed } = agenticEmbedPkg` | Minor — default import destructured, not named import |
| Empty string | Returns `[]` | `if (text === '') return []` (line 6) | ✅ None |
| TypeError | Documented | `if (typeof text !== 'string') throw new TypeError(...)` (line 5) | ✅ None |

### src/runtime/adapters/embed.js (3 lines)

| Aspect | ARCHITECTURE.md | Actual Source | Gap |
|--------|----------------|---------------|-----|
| Dead code | Noted in §10 and §11 | `throw new Error('agentic-embed: not implemented')` | ✅ None |

### src/runtime/adapters/sense.js (7 lines)

| Aspect | ARCHITECTURE.md §11 | Actual Source | Gap |
|--------|---------------------|---------------|-----|
| Export | `createPipeline(options?) → AgenticSense` | Same | ✅ None |
| Import | `import { AgenticSense } from 'agentic-sense'` | Same | ✅ None |
| Init | `new AgenticSense(null, options) + init()` | `if (typeof instance.init === 'function') instance.init()` — conditional init | Minor |

### src/runtime/adapters/voice/* (7 files — verified signatures)

| Adapter | Export(s) | Type | Auth Required |
|---------|-----------|------|---------------|
| sensevoice.js (21 lines) | `check()`, `transcribe(buffer) → string` | STT | None (local HTTP 127.0.0.1:18906, SENSEVOICE_URL env) |
| whisper.js (29 lines) | `check()`, `transcribe(buffer) → string` | STT | None (local binary, WHISPER_BIN/WHISPER_MODEL env) |
| openai-whisper.js (9 lines) | `transcribe(buffer) → string` | STT | OPENAI_API_KEY |
| piper.js (119 lines) | `synthesize(text) → Buffer` | TTS | None (auto-downloads binary + voice model) |
| openai-tts.js (24 lines) | `synthesize(text) → Buffer` | TTS | OPENAI_API_KEY or config.tts.apiKey |
| elevenlabs.js (48 lines) | `synthesize(text) → Buffer` | TTS | ELEVENLABS_API_KEY or config.tts.apiKey |
| macos-say.js (61 lines) | `synthesize(text) → Buffer`, `listVoices() → Array<{name, locale}>` | TTS | None (darwin only) |

All listed in §11 ✅. Gap: §11 doesn't show explicit function signatures or auth requirements.

## Recommended Changes

Sections §10 and §11 already exist with accurate content. Minor enhancements:

1. §10: Fix import note — actual source uses default import + destructure, not named import:
   ```javascript
   import agenticEmbedPkg from 'agentic-embed'
   const { localEmbed } = agenticEmbedPkg
   ```
2. §11: Expand voice adapter block to show function signatures and auth:
   ```javascript
   // STT adapters — contract: transcribe(buffer) → Promise<string>
   //   sensevoice.js  — check() + transcribe() — SenseVoice HTTP (SENSEVOICE_URL env)
   //   whisper.js     — check() + transcribe() — whisper-cli local binary (WHISPER_BIN/WHISPER_MODEL env)
   //   openai-whisper.js — transcribe() — OpenAI Whisper API (requires OPENAI_API_KEY)
   //
   // TTS adapters — contract: synthesize(text) → Promise<Buffer>
   //   piper.js       — auto-downloads piper binary + voice model on first use
   //   openai-tts.js  — OpenAI TTS API (requires OPENAI_API_KEY or config.tts.apiKey)
   //   elevenlabs.js  — ElevenLabs streaming API (requires ELEVENLABS_API_KEY or config.tts.apiKey)
   //   macos-say.js   — macOS say command (darwin only) + listVoices()
   ```
3. §11: Note that `createPipeline` does conditional init (`if typeof init === 'function'`)

## Verification

After update, confirm:
- §10 exists with `embed(text)` export, TypeError/empty-string behavior
- §11 exists with `createPipeline()`, dead code note, all 7 voice adapters
- Import style matches actual source

## Assessment

This gap appears already closed — both §10 and §11 exist with accurate content. Architect should verify against source and mark done, optionally fixing the minor import style discrepancy.
