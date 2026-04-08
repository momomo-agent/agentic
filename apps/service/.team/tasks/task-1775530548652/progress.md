# Implement server-side VAD silence suppression

## Implementation

Added to `src/server/hub.js`:

1. **isSilent() function**: Calculates RMS energy from float32 PCM audio buffer
   - Returns true if RMS < 0.01 (silence threshold)
   - Handles empty buffers (returns true)
   - Expects float32 LE PCM format

2. **Audio event handler**: Added to init() function
   - Listens for 'audio' events from sense.startHeadless()
   - Drops silent frames before forwarding to STT pipeline
   - TODO comment for future STT integration

## Algorithm

```js
RMS = sqrt(sum(sample^2) / count)
isSilent = RMS < 0.01
```

## Status
Complete. VAD silence suppression implemented as specified. Audio event handler ready for when audio streaming is added to the sense emitter.