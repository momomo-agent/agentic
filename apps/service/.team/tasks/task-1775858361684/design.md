# Task Design: Add voice adapter API signatures to ARCHITECTURE.md

**Task:** task-1775858361684
**Module:** Runtime（服务运行时） — ARCHITECTURE.md §3 Runtime, adapters subsection
**Module Design:** `.team/designs/runtime.design.md`
**Assignee:** architect (ARCHITECTURE.md is architect-owned)

## Problem

Voice adapters are listed in ARCHITECTURE.md's directory tree but lack formal API signature documentation. Seven adapter files exist under `src/runtime/adapters/voice/` with verified exports.

## Verified Adapter Signatures (from source code)

### STT Adapters

```javascript
// adapters/voice/sensevoice.js (22 lines)
export async function check()              // health-check SenseVoice HTTP service (2s timeout)
export async function transcribe(buffer)   // POST audio buffer (webm) → text; SENSEVOICE_URL env (default http://127.0.0.1:18906)

// adapters/voice/whisper.js (30 lines)
export async function check()              // verify whisper binary + model file exist
export async function transcribe(buffer)   // write temp WAV → exec whisper-cli (30s timeout) → text; WHISPER_BIN + WHISPER_MODEL env

// adapters/voice/openai-whisper.js (10 lines)
export async function transcribe(buffer)   // OpenAI Whisper API (model: whisper-1) → text; requires OPENAI_API_KEY
```

### TTS Adapters

```javascript
// adapters/voice/openai-tts.js (25 lines)
export async function synthesize(text)     // OpenAI speech API (model: tts-1, voice: alloy) → audio buffer; requires OPENAI_API_KEY or config

// adapters/voice/elevenlabs.js (49 lines)
export async function synthesize(text)     // ElevenLabs TTS API (model: eleven_flash_v2_5) → audio buffer; requires ELEVENLABS_API_KEY or config

// adapters/voice/piper.js (120 lines)
export async function synthesize(text)     // local Piper binary → WAV buffer; auto-downloads binary + voice model from HuggingFace

// adapters/voice/macos-say.js (62 lines)
export async function synthesize(text)     // macOS `say` command → WAV buffer (16-bit PCM, 22050 Hz); darwin-only
export async function listVoices()         // `say -v ?` → [{ name, locale }]
```

## Proposed ARCHITECTURE.md Section

Add under the existing Runtime module section (after the TTS adapter registry documentation), a new subsection:

```markdown
### Voice Adapter 接口

所有 STT 适配器导出:
- `check()` → Promise<void> — 可选，验证后端可用性
- `transcribe(buffer)` → Promise<string> — 音频 buffer → 文本

所有 TTS 适配器导出:
- `synthesize(text)` → Promise<Buffer> — 文本 → 音频 buffer

| 适配器 | 类型 | 后端 | 配置 |
|--------|------|------|------|
| sensevoice.js | STT | SenseVoice HTTP (127.0.0.1:18906) | `SENSEVOICE_URL` env |
| whisper.js | STT | whisper-cli 本地二进制 | `WHISPER_BIN`, `WHISPER_MODEL` env |
| openai-whisper.js | STT | OpenAI Whisper API | `OPENAI_API_KEY` env |
| openai-tts.js | TTS | OpenAI Speech API | `OPENAI_API_KEY` env/config |
| elevenlabs.js | TTS | ElevenLabs API | `ELEVENLABS_API_KEY` env/config |
| piper.js | TTS | Piper 本地二进制（自动下载） | config voice 设置 |
| macos-say.js | TTS | macOS `say` 命令 | config voice 设置，仅 darwin |
```

## Files to Modify

### 1. EDIT `ARCHITECTURE.md` (architect-owned)
- Add the voice adapter interface table after the existing TTS/STT adapter registry docs
- Location: after line ~310 (current TTS adapter section) or as a new subsection under Runtime

### 2. No source code changes required
This is a documentation-only task.

## Implementation Steps

1. Architect adds the voice adapter interface section to ARCHITECTURE.md
2. Verify all signatures match source (already verified in this design)
3. No tests needed — documentation only

## ⚠️ Unverified Assumptions

- `kokoro.js` adapter is being created by task-1775858113988 (in progress). Once created, its signature should be added to this table. The architect should coordinate timing.
