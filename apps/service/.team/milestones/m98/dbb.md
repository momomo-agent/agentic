# M98 DBB — PRD Gap Closure: Critical Path to 90%

## DBB-001: src/index.js exports
- Requirement: M98 Scope #1 (src/index.js missing)
- Given: `node -e "const m = require('./src/index.js'); console.log(Object.keys(m))"`
- Expect: exit code 0, output includes `startServer`, `detector`, `runtime`
- Verify: Each exported key is a function or object (not undefined)

## DBB-002: src/index.js require does not throw
- Requirement: M98 Scope #1
- Given: `node -e "require('./src/index.js')"`
- Expect: exit code 0, no error output
- Verify: Process exits cleanly

## DBB-003: Docker port 1234
- Requirement: M98 Scope #2 (Docker port mismatch)
- Given: Run `docker-compose config` from project root
- Expect: Output shows port mapping to 1234 (not 3000)
- Verify: Published port is `1234:1234` or equivalent

## DBB-004: Docker OLLAMA_HOST env var
- Requirement: M98 Scope #4 (Root docker-compose.yml)
- Given: Run `docker-compose config` from project root
- Expect: Output includes `OLLAMA_HOST` environment variable
- Verify: Variable is present in the service environment section

## DBB-005: Docker data volume mount
- Requirement: M98 Scope #4 (Root docker-compose.yml)
- Given: Run `docker-compose config` from project root
- Expect: Output includes a volume mount for `./data`
- Verify: Volume mapping shows `./data` bound to a container path

## DBB-006: Cloud fallback — timeout trigger
- Requirement: M98 Scope #3 (Cloud fallback incomplete)
- Given: LLM request takes >5 seconds to respond
- Expect: System switches to cloud fallback provider
- Verify: Subsequent requests route to cloud provider; logs indicate timeout-triggered fallback

## DBB-007: Cloud fallback — consecutive error trigger
- Requirement: M98 Scope #3
- Given: 3 consecutive LLM errors occur
- Expect: System switches to cloud fallback provider after the 3rd error
- Verify: 4th request routes to cloud provider; logs indicate error-count-triggered fallback

## DBB-008: Cloud fallback — auto-restore
- Requirement: M98 Scope #3
- Given: System is in cloud fallback mode, local LLM becomes available again
- Expect: After ~60 seconds, system probes local LLM and restores local routing on success
- Verify: Requests resume routing to local Ollama; logs indicate successful probe and restore

## DBB-009: Cloud fallback — stays in fallback on probe failure
- Requirement: M98 Scope #3
- Given: System is in cloud fallback mode, local LLM is still unavailable
- Expect: After 60s probe, system remains in cloud fallback mode
- Verify: Requests continue routing to cloud provider

## DBB-010: README troubleshooting section
- Requirement: M98 Scope #5
- Given: Read README.md
- Expect: Contains a "Troubleshooting" section (or equivalent heading)
- Verify: Section includes at least common issues (e.g., Ollama not found, port conflicts, model download failures)

## DBB-011: ARCHITECTURE.md — no stale CR content
- Requirement: M98 Scope #6
- Given: Read ARCHITECTURE.md
- Expect: No change-request or CR content in the document
- Verify: File does not contain CR-related blocks or stale references

## DBB-012: ARCHITECTURE.md — directory tree accuracy
- Requirement: M98 Scope #6
- Given: Compare ARCHITECTURE.md directory tree with actual `src/` contents
- Expect: All source files in `src/` are represented in the directory tree
- Verify: No missing files; port references show 1234 (not 3000)

## DBB-013: Cloud fallback — single error does not trigger
- Requirement: M98 Scope #3 (boundary condition)
- Given: 1 or 2 LLM errors occur (fewer than 3)
- Expect: System does NOT switch to cloud fallback
- Verify: Requests continue routing to local Ollama

## DBB-014: Cloud fallback — timeout boundary
- Requirement: M98 Scope #3 (boundary condition)
- Given: LLM request takes exactly 5 seconds
- Expect: System does NOT trigger fallback (only >5s triggers)
- Verify: Request completes via local provider
