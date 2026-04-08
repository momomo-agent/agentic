# M88: Voice Latency Benchmarking + CPU Profiling

## Goals
- Measure and enforce <2s end-to-end voice latency (STT+LLM+TTS)
- Add CPU profiling / performance instrumentation

## Acceptance Criteria
- Latency benchmark test: STT+LLM+TTS pipeline completes in <2000ms on reference hardware
- CPU profiling module instruments key pipeline stages
- Performance metrics exposed via /api/status or dedicated /api/perf endpoint

## Tasks
1. Add latency benchmark test for STT+LLM+TTS pipeline
2. Implement CPU profiling instrumentation in runtime pipeline
3. Expose performance metrics via API
