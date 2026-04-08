# Voice latency benchmark: enforce <2s STT+LLM+TTS end-to-end

## Implementation

Added new `/api/voice` endpoint in `src/server/api.js` that chains the full voice pipeline:

1. **STT**: Transcribe audio buffer to text
2. **LLM**: Process text through chat() and collect response
3. **TTS**: Synthesize reply to audio

## Latency Tracking

- Measures wall-clock time from start to finish
- Logs latency on every request: `[voice] latency: ${ms}ms`
- Logs error when threshold exceeded: `[voice] LATENCY EXCEEDED: ${ms}ms`
- Service continues even if threshold exceeded (log only, no throw)

## Endpoint Details

- **Route**: `POST /api/voice`
- **Input**: Audio file (multipart/form-data)
- **Output**: Audio WAV file (synthesized reply)
- **VAD**: Skips processing if no voice activity detected

## Status
Complete. Latency benchmark implemented as specified.