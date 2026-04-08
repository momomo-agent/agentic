# M43: VAD + README + CDN Endpoint + Headless Sense

## Goals
- Implement VAD (Voice Activity Detection) auto-detection
- Write user-facing README with setup and usage instructions
- Replace CDN placeholder URL with real endpoint
- Add server-side headless camera path to sense.js

## Acceptance Criteria
- VAD detects speech start/end without push-to-talk
- README covers install, config, and usage
- CDN URL resolves to real profiles endpoint
- sense.js supports headless (non-browser) camera input

## Blocked By
- M42 must complete first (wake word pipeline, voice latency, HTTPS)
