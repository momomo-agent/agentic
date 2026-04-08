# M47: Polish, Verification + Remaining Gaps

## Goals
- Implement src/ui/admin/ admin panel
- Complete admin route in src/ui/client/
- Fill out src/detector/optimizer.js full optimization logic
- Merge gpu-detector.js into hardware.js per architecture spec

## Acceptance Criteria
- /admin route renders hardware info, config, devices, logs
- optimizer.js covers full hardware optimization (not just matching)
- Admin panel accessible from main UI
- gpu-detector.js logic absorbed into hardware.js, file removed

## Tasks
- task-1775523890981: src/ui/admin/ — admin panel implementation (P1)
- task-1775523895031: src/ui/client/ — admin route completion (P1)
- task-1775523899911: src/detector/optimizer.js — full optimization logic (P1)
- task-1775524560816: src/detector/gpu-detector.js — merge into hardware.js (P1)

## Blocked By
- M44 must complete first (Ollama auto-install, npx entrypoint, multi-device brain state)
