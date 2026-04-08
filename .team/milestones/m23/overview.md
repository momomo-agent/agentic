# M23: App.vue修复 + VAD + 测试覆盖率 + README

## Goals
- Fix App.vue missing component imports, polling, and prop bindings
- Implement VAD auto-STT in web UI
- Improve test coverage from 71% to ≥98%
- Write README.md with npx/global/Docker install + API docs

## Acceptance Criteria
- App.vue correctly imports DeviceList, LogViewer, HardwarePanel
- App.vue polls /api/status with setInterval and binds :devices/:hardware props
- VAD auto-detection starts recording when voice activity detected
- Test coverage threshold ≥98% configured and passing
- README.md present at project root with all install methods documented

## Gaps Addressed
- test-coverage: 71% → ≥98%
- prd: App.vue component wiring, VAD, README
- vision: Voice latency pipeline completeness
