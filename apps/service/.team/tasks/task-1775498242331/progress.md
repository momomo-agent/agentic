# 唤醒词检测

## Progress

- Created `src/ui/client/src/components/WakeWord.vue`: SpeechRecognition continuous listener, emits `activated`, auto-restart (max 3), silent degradation
- Updated `App.vue`: fetches wakeWord from `/api/config`, mounts WakeWord, calls `chatBox.startRecording()` on activation
- Updated `ChatBox.vue`: added `ptt` ref, exposed `startRecording()`
- Updated `PushToTalk.vue`: exposed `start`/`stop` via `defineExpose`

## Assumptions
- Component placed in `src/ui/client/src/components/` (existing structure) vs design's `src/ui/client/`
- Config key is `wakeWord` (matches existing ChatBox.vue usage)

