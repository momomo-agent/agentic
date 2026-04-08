# M42: Wake Word Integration + Voice Latency + HTTPS

## Goals
- Integrate wake word detection into server-side STT pipeline
- Benchmark and enforce voice latency <2s end-to-end
- HTTPS / LAN tunneling for secure multi-device access

## Acceptance Criteria
- Wake word triggers server-side STT pipeline (not just UI composable)
- STT+LLM+TTS round-trip measured and passes <2s gate
- HTTPS enabled via self-signed cert or LAN tunnel

## Tasks
- task-1775523312966: Wake word server-side pipeline integration (P1)
- task-1775523317979: Voice latency <2s benchmark (P1)
- task-1775523318012: HTTPS / LAN tunnel for multi-device access (P1)
