# M47 DBB — Admin UI + optimizer.js + UI Route Completion

## DBB-001: /admin returns HTTP 200
- Given: Service running
- Expect: `curl http://localhost:<port>/admin` returns 200
- Verify: HTTP status code is 200

## DBB-002: Admin panel shows hardware, config, devices, logs
- Given: Browser at /admin
- Expect: Page renders hardware info, active config, connected devices, and log output
- Verify: DOM contains hardware/config/devices/logs sections

## DBB-003: Admin route accessible from main UI
- Given: User on main chat UI
- Expect: Navigation link to /admin is present and functional
- Verify: Clicking admin link navigates to /admin without 404

## DBB-004: optimizer.js returns non-null config for all hardware types
- Given: apple-silicon, nvidia, cpu-only hardware inputs
- Expect: optimizer returns non-empty config object for each
- Verify: Unit test covers all three hardware types, no null/empty returns

## DBB-005: gpu-detector.js not referenced in codebase
- Given: Project codebase after merge
- Expect: No file imports gpu-detector.js
- Verify: `grep -r "gpu-detector" src/` returns no results
