# M86 DBB — Docker Fix: agentic-* Package Resolution

## Done-By-Definition Criteria

- [ ] `docker build -f install/Dockerfile .` exits with code 0
- [ ] `docker-compose -f install/docker-compose.yml up -d` starts service on port 3000
- [ ] `curl http://localhost:3000/api/status` returns 200 JSON response
- [ ] No `npm ERR! 404 Not Found` errors for agentic-embed, agentic-sense, agentic-store, agentic-voice
- [ ] task-1775529630008 Docker test passes
