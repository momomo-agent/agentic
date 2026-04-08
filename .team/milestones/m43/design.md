# M43 Technical Design — VAD + README + CDN Endpoint + Headless Sense

## Overview
Four independent tasks: wire VAD into the chat UI, write README, fix CDN URL, add headless camera path to sense.js.

## Task Breakdown

### 1. VAD auto-detection
- `useVAD.js` already implements RMS-based VAD — integrate it into `App.vue` or `ChatBox.vue`
- Replace push-to-talk with VAD: call `vad.start()` on mount, `vad.stop()` on unmount
- `onStart` → begin audio capture/recording; `onStop` → send audio to `/api/transcribe`

### 2. README
- Create `README.md` at repo root
- Sections: Install (npx/global/docker), Config (env vars, profiles), Usage (chat UI, admin panel)

### 3. CDN real endpoint
- Update `PROFILES_URL` default in `src/detector/profiles.js` to real GitHub raw URL

### 4. sense.js headless camera
- `initHeadless()` already exists — ensure `detectFrame(buffer)` handles real image buffers
- Add Node.js-compatible image decode path (e.g. accept raw pixel buffer or skip decode if null)
