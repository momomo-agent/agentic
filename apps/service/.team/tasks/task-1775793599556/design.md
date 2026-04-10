# Task Design: Add README troubleshooting section

**Module:** Documentation (cross-cutting)
**Task:** task-1775793599556

## Problem

README.md (267 lines) has no troubleshooting section. PRD gap analysis flags this as a `partial` documentation gap.

## Files to Modify

- `README.md` — VERIFIED exists, starts with Quick Start / Install / CLI Options sections

## Implementation Plan

Append a `## Troubleshooting` section before any footer/license section. Content:

```markdown
## Troubleshooting

### Ollama not starting

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama manually
ollama serve
```

If Ollama isn't installed, agentic-service will attempt to install it on first run.

### Port already in use (EADDRINUSE)

```bash
# Find what's using port 1234
lsof -i :1234

# Use a different port
agentic-service --port 3456
```

### Model download stuck

- Check your network connection and proxy settings
- Try pulling the model manually: `ollama pull <model-name>`
- For slow connections, the download may take several minutes for larger models

### Docker: can't connect to Ollama

Ensure `OLLAMA_HOST` is set in your docker-compose.yml:

```yaml
environment:
  - OLLAMA_HOST=http://host.docker.internal:11434
```

On Linux without Docker Desktop, you may need `--add-host=host.docker.internal:host-gateway`.

### Out of memory / model too large

- Run `agentic-service` without arguments — it auto-selects a model sized for your hardware
- For low-memory systems, the optimizer picks smaller quantized models
- Set a specific smaller model: `agentic-service --model gemma3:4b-q4`
```

## Test Cases

1. `grep -i 'troubleshooting' README.md` → matches section heading
2. Section covers all 5 required topics: Ollama, port, download, Docker, memory
3. Port references use 1234 (not 3000)

## ⚠️ Unverified Assumptions

- None. All content is generic troubleshooting guidance matching verified system behavior.
