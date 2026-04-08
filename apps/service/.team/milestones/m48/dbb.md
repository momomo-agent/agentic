# M48 DBB — Docker + Test Coverage + SIGINT + setup.sh + Ollama Fallback

## DBB-001: Docker build succeeds
- Given: Project root with Dockerfile
- Expect: `docker build .` exits 0
- Verify: Build completes without error

## DBB-002: docker-compose up starts service
- Given: docker-compose.yml present
- Expect: `docker-compose up` starts container, `/api/status` returns 200
- Verify: `curl http://localhost:3000/api/status` returns 200 within 30s

## DBB-003: Test coverage >=98%
- Given: Full test suite run
- Expect: Coverage report shows >=98% lines/branches
- Verify: `npm test -- --coverage` exits 0 with >=98% reported

## DBB-004: SIGINT drains in-flight requests
- Given: Active STT/LLM/TTS request in progress
- Expect: SIGINT causes graceful drain — request completes before process exits
- Verify: Send SIGINT during active request, confirm response delivered before exit

## DBB-005: setup.sh is idempotent
- Given: setup.sh already run once
- Expect: Running again does not error or duplicate installs
- Verify: Run setup.sh twice, second run exits 0 with no errors

## DBB-006: Ollama non-200 triggers cloud fallback
- Given: Ollama returns non-200 response
- Expect: Request falls back to cloud provider, not crash
- Verify: Mock Ollama 500, confirm cloud fallback response returned
