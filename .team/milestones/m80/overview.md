# M80: Vision Gaps — Wake Word + Cross-Device Brain State

## Goals
Implement server-side wake word pipeline and deepen cross-device brain state sharing.

## Status
PLANNED - Will start after m74, m76, m77 complete.

## Scope
- Server-side wake word pipeline in sense.js (Vision partial → P1)
- Cross-device brain state sharing in hub.js (Vision partial → P1)

## Acceptance Criteria
- sense.js startWakeWordPipeline() captures mic audio and fires wakeword events
- hub.js broadcastSession shares brain state (history, context) across connected devices
