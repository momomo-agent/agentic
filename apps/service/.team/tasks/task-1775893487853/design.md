# Task Design: 音频格式校验 — transcriptions 端点前置检查

**Task:** task-1775893487853
**Module:** Server（HTTP/WebSocket）— ARCHITECTURE.md §3
**Module Design:** `.team/designs/server.design.md`

## Overview

`POST /v1/audio/transcriptions` (line 176 of `src/server/api.js`) currently passes `req.file.buffer` directly to `stt.transcribe()` without validating the audio format. Invalid files (text, images, random bytes) cause the STT engine to throw a 500 error. We need a pre-validation step that checks file magic bytes and returns 400 for unsupported formats.

## Current Flow (verified from `src/server/api.js` lines 175-190)

```
POST /v1/audio/transcriptions
  → multer upload.single('file')
  → if (!req.file) → 400
  → stt.transcribe(req.file.buffer)  ← no format check here
  → catch → 500
```

## Files to Modify

| File | Action |
|------|--------|
| `src/server/api.js` | Add audio format validation before `stt.transcribe()` call (lines 176-190) |
| `test/server/m103-audio-validation.test.js` | Create |

## Implementation Plan

### Step 1: Add audio format validation in `src/server/api.js`

Add a validation function near the top of the file (after the `apiError` helper from task-1775893487814, or standalone if that task isn't done yet):

```javascript
// Supported audio magic bytes
const AUDIO_SIGNATURES = [
  { ext: 'wav',  magic: [0x52, 0x49, 0x46, 0x46] },           // RIFF
  { ext: 'mp3',  magic: [0xFF, 0xFB] },                        // MP3 frame sync
  { ext: 'mp3',  magic: [0xFF, 0xF3] },                        // MP3 frame sync (alt)
  { ext: 'mp3',  magic: [0xFF, 0xF2] },                        // MP3 frame sync (alt)
  { ext: 'mp3',  magic: [0x49, 0x44, 0x33] },                  // ID3 tag
  { ext: 'ogg',  magic: [0x4F, 0x67, 0x67, 0x53] },           // OggS
  { ext: 'flac', magic: [0x66, 0x4C, 0x61, 0x43] },           // fLaC
  { ext: 'webm', magic: [0x1A, 0x45, 0xDF, 0xA3] },           // EBML (WebM/MKV)
  { ext: 'mp4',  offset: 4, magic: [0x66, 0x74, 0x79, 0x70] }, // ftyp (M4A/MP4)
  { ext: 'amr',  magic: [0x23, 0x21, 0x41, 0x4D, 0x52] },     // #!AMR
];

function isValidAudio(buffer) {
  if (!buffer || buffer.length < 12) return false;
  return AUDIO_SIGNATURES.some(sig => {
    const offset = sig.offset || 0;
    return sig.magic.every((byte, i) => buffer[offset + i] === byte);
  });
}
```

### Step 2: Add validation to the transcriptions handler

Modify the handler at line 176:

```javascript
r.post('/v1/audio/transcriptions', upload.single('file'), async (req, res) => {
  if (!req.file) return apiError(res, 400, 'file is required', 'invalid_request_error', 'missing_required_field');

  // Validate audio format via magic bytes
  if (!isValidAudio(req.file.buffer)) {
    return apiError(res, 400, 'Invalid audio format. Supported: wav, mp3, ogg, flac, webm, mp4/m4a, amr', 'invalid_request_error', 'invalid_audio_format');
  }

  const responseFormat = req.body?.response_format || 'json';
  try {
    const text = await stt.transcribe(req.file.buffer);
    // ... rest unchanged
  } catch (error) {
    apiError(res, 500, error.message, 'server_error', null);
  }
});
```

Note: If task-1775893487814 (error format) is not yet implemented, use inline `res.status(400).json({ error: { message: '...', type: 'invalid_request_error', code: 'invalid_audio_format' } })` instead of `apiError()`.

### Step 3: Test file `test/server/m103-audio-validation.test.js`

Mock pattern same as `api.extra.test.js`.

Test cases:
1. **DBB-007**: POST with a `.txt` file (random ASCII bytes) → 400, error body has `message`, `type`, `code`
2. **DBB-008**: POST with valid WAV magic bytes (`RIFF....WAVE`) → passes validation (not rejected)
3. **DBB-008**: POST with valid MP3 magic bytes (ID3 tag) → passes validation
4. **DBB-009**: POST with empty file (0 bytes) → 400
5. POST with random binary (no matching signature) → 400

For test WAV buffer:
```javascript
// Minimal WAV header: RIFF + size + WAVE
const wavBuffer = Buffer.from([
  0x52, 0x49, 0x46, 0x46,  // RIFF
  0x24, 0x00, 0x00, 0x00,  // chunk size
  0x57, 0x41, 0x56, 0x45,  // WAVE
  0x66, 0x6D, 0x74, 0x20,  // fmt
  // ... minimal PCM header
]);
```

For test MP3 buffer:
```javascript
const mp3Buffer = Buffer.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
```

## Dependency on task-1775893487814

This task uses `apiError()` helper if available. If task-1775893487814 is done first, use the helper. If not, use inline error responses with `code` field included (to satisfy DBB-004 for this endpoint).

## ⚠️ Unverified Assumptions

- Magic byte detection covers the most common audio formats. Exotic formats (e.g., AIFF, AU) are not included but can be added later if needed.
- `multer` with `memoryStorage()` provides `req.file.buffer` as a `Buffer` — verified from line 28 of api.js.
