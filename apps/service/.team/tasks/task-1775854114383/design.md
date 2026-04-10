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

### src/runtime/adapters/voice/* (7 files)

| Adapter | ARCHITECTURE.md §11 | Listed | Gap |
|---------|---------------------|--------|-----|
| sensevoice.js | SenseVoice STT (HTTP API) | ✅ | None |
| whisper.js | Whisper.cpp STT (local binary) | ✅ | None |
| openai-whisper.js | OpenAI Whisper API (cloud) | ✅ | None |
| piper.js | Piper TTS (auto-download) | ✅ | None |
| openai-tts.js | OpenAI TTS API (cloud) | ✅ | None |
| elevenlabs.js | ElevenLabs TTS (cloud) | ✅ | None |
| macos-say.js | macOS say (local) | ✅ | None |

## Recommended Changes

Sections §10 and §11 already exist with accurate content. Minor enhancements:

1. §10: Fix import note — actual source uses default import + destructure, not named import:
   ```javascript
   import agenticEmbedPkg from 'agentic-embed'
   const { localEmbed } = agenticEmbedPkg
   ```
2. §11: Note that `createPipeline` does conditional init (`if typeof init === 'function'`)

## Verification

After update, confirm:
- §10 exists with `embed(text)` export, TypeError/empty-string behavior
- §11 exists with `createPipeline()`, dead code note, all 7 voice adapters
- Import style matches actual source

## Assessment

This gap appears already closed — both §10 and §11 exist with accurate content. Architect should verify against source and mark done, optionally fixing the minor import style discrepancy.
