# M39: Detector层补全 + Admin UI + 默认Profile

## Goals
Close remaining P0/P1 architecture gaps in detector layer and UI.

## Scope
- `src/detector/profiles.js` — getProfile(hardware) implementation
- `src/detector/optimizer.js` — hardware optimization path (merge gpu-detector logic)
- `profiles/default.json` — default hardware profile (cpu-only + gpu)
- `src/ui/admin/` — admin panel accessible at /admin route

## Acceptance Criteria
- getProfile(hardware) returns valid profile for Apple Silicon / NVIDIA / CPU-only
- optimizer.js covers full optimization logic per ARCHITECTURE.md
- profiles/default.json present with valid schema
- /admin route loads with device list, logs, hardware panels

## Dependencies
- Blocked by m38 (server layer needed for admin panel data)
