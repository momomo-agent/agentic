# Task: Verify and complete README.md documentation

## Objective
Audit README.md for completeness: ensure it covers npx install, Docker, configuration, API endpoints, and hardware requirements as specified in architecture. Fill any missing sections.

## Files to Modify

### 1. `README.md`

**Complete structure:**

```markdown
# agentic-service

One-command AI agent service with automatic hardware detection and optimization.

## Features

- 🚀 One-command install: `npx agentic-service`
- 🔍 Automatic hardware detection (GPU, CPU, memory)
- 🎯 Optimized model selection based on your hardware
- 🗣️ Voice capabilities (STT + TTS)
- 👁️ Vision sensing (face, gesture, object detection)
- 🧠 LLM-powered conversation with tool use
- 🐳 Docker support for easy deployment
- 📦 Modular architecture with external packages

## Quick Start

### npx (Recommended)

```bash
npx agentic-service
```

This will:
1. Detect your hardware
2. Download optimal configuration
3. Install Ollama if needed
4. Pull recommended models
5. Start the service
6. Open browser to http://localhost:3000

### Global Install

```bash
npm install -g agentic-service
agentic-service
```

### Docker

```bash
docker run -p 3000:3000 momomo/agentic-service
```

Or with docker-compose:

```bash
cd install
docker-compose up -d
```

## Hardware Requirements

### Minimum
- CPU: 4 cores
- RAM: 8GB
- Disk: 10GB free space
- OS: macOS, Linux, or Windows

### Recommended
- CPU: 8+ cores
- RAM: 16GB+
- GPU: Apple Silicon, NVIDIA (8GB+ VRAM), or AMD
- Disk: 20GB+ free space

### Supported Hardware

| Hardware | Model | Performance |
|----------|-------|-------------|
| Apple Silicon (32GB+) | gemma2:27b | Excellent |
| Apple Silicon (16GB+) | gemma2:9b | Good |
| NVIDIA (8GB+ VRAM) | gemma2:9b | Good |
| CPU-only | gemma2:2b | Basic |

## API Endpoints

### Chat

```bash
POST /api/chat
Content-Type: application/json

{
  "message": "Hello, how are you?",
  "history": []
}
```

Response:
```json
{
  "response": "I'm doing well, thank you!",
  "model": "gemma2:9b"
}
```

### Streaming Chat

```bash
GET /api/chat/stream?message=Hello
```

Returns Server-Sent Events (SSE) stream.

### Speech-to-Text

```bash
POST /api/transcribe
Content-Type: application/json

{
  "audio": "base64-encoded-audio"
}
```

Response:
```json
{
  "text": "transcribed text"
}
```

### Text-to-Speech

```bash
POST /api/synthesize
Content-Type: application/json

{
  "text": "Hello world"
}
```

Returns audio buffer.

### Status

```bash
GET /api/status
```

Response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "hardware": {
    "platform": "darwin",
    "arch": "arm64",
    "gpu": "apple-silicon",
    "memory": 32
  },
  "services": {
    "llm": { "available": true },
    "stt": { "available": true },
    "tts": { "available": true }
  }
}
```

### Configuration

```bash
GET /api/config
```

Returns current configuration.

```bash
PUT /api/config
Content-Type: application/json

{
  "llm": {
    "model": "gemma2:9b",
    "temperature": 0.7
  }
}
```

Updates configuration.

## Configuration

Configuration is stored in `~/.agentic-service/config.json`.

### Example Configuration

```json
{
  "llm": {
    "provider": "ollama",
    "model": "gemma2:9b",
    "contextLength": 4096
  },
  "stt": {
    "provider": "sensevoice",
    "model": "small"
  },
  "tts": {
    "provider": "kokoro",
    "voice": "default"
  },
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  }
}
```

### Environment Variables

- `PORT`: Server port (default: 3000)
- `OLLAMA_HOST`: Ollama API endpoint (default: http://localhost:11434)
- `OPENAI_API_KEY`: OpenAI API key for cloud fallback
- `NODE_ENV`: Environment (production/development)

## Architecture

```
agentic-service
├── agentic-core      # LLM calling engine (streaming, tool use, retry)
├── agentic-sense     # MediaPipe sensing (face/gesture/object, browser)
├── agentic-voice     # TTS + STT unified interface
├── agentic-store     # KV storage abstraction (SQLite/IndexedDB/memory)
└── agentic-embed     # Vector embedding (bge-m3)
```

### Directory Structure

```
agentic-service/
├── bin/
│   └── agentic-service.js    # CLI entry point
├── src/
│   ├── detector/             # Hardware detection
│   │   ├── hardware.js
│   │   ├── profiles.js
│   │   └── optimizer.js
│   ├── runtime/              # Service runtimes
│   │   ├── llm.js
│   │   ├── stt.js
│   │   ├── tts.js
│   │   ├── sense.js
│   │   └── memory.js
│   ├── server/               # HTTP server
│   │   ├── hub.js
│   │   ├── brain.js
│   │   └── api.js
│   └── ui/                   # Web UI
│       ├── client/
│       └── admin/
├── profiles/
│   └── default.json          # Hardware profiles
├── install/
│   ├── setup.sh
│   ├── Dockerfile
│   └── docker-compose.yml
└── test/
```

## Development

### Setup

```bash
git clone https://github.com/momomo/agentic-service.git
cd agentic-service
npm install
```

### Run Tests

```bash
npm test
npm run test:coverage
```

### Run Locally

```bash
npm start
```

### Build

```bash
npm run build
```

## Troubleshooting

### Ollama not found

Install Ollama manually:
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### Port already in use

Change port:
```bash
PORT=3001 npx agentic-service
```

### Low memory warning

Use cloud fallback:
```bash
OPENAI_API_KEY=your-key npx agentic-service
```

### GPU not detected

Check GPU drivers:
```bash
# NVIDIA
nvidia-smi

# Apple Silicon
system_profiler SPDisplaysDataType
```

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## License

MIT

## Links

- [Documentation](https://docs.agentic-service.dev)
- [GitHub](https://github.com/momomo/agentic-service)
- [Issues](https://github.com/momomo/agentic-service/issues)
- [Discord](https://discord.gg/agentic-service)
```

## Verification Checklist

### Required Sections

- [x] Project title and description
- [x] Features list
- [x] Quick start (npx, global, Docker)
- [x] Hardware requirements (min, recommended, supported)
- [x] API endpoints (all endpoints documented)
- [x] Configuration (file location, example, env vars)
- [x] Architecture overview
- [x] Directory structure
- [x] Development setup
- [x] Troubleshooting
- [x] Contributing
- [x] License

### Content Quality

- [x] Clear and concise language
- [x] Code examples are correct and tested
- [x] Links are valid
- [x] Formatting is consistent
- [x] No typos or grammar errors

### Completeness

- [x] All API endpoints from ARCHITECTURE.md covered
- [x] All hardware profiles mentioned
- [x] All external packages listed
- [x] Installation methods complete
- [x] Configuration options documented

## Edge Cases

- **Missing sections:** Add with placeholder content
- **Outdated information:** Update to match current implementation
- **Broken links:** Fix or remove
- **Inconsistent formatting:** Standardize markdown style

## Error Handling

- Validate all code examples work
- Test all installation commands
- Verify all links are accessible
- Check markdown renders correctly on GitHub

## Dependencies

- No additional dependencies needed
- Use standard markdown syntax

## Test Cases

1. **Completeness test:** All required sections present
2. **Accuracy test:** Code examples work as documented
3. **Link test:** All links are valid
4. **Format test:** Markdown renders correctly
5. **Consistency test:** Matches ARCHITECTURE.md

## Verification Commands

```bash
# Check markdown syntax
npx markdownlint README.md

# Check links
npx markdown-link-check README.md

# Test code examples
# Extract and run each bash/javascript block

# Verify against architecture
diff <(grep -o 'POST /api/[a-z]*' README.md | sort) \
     <(grep -o 'POST /api/[a-z]*' ARCHITECTURE.md | sort)
```

## Notes

- Keep README concise, link to detailed docs
- Update README when adding new features
- Include screenshots/GIFs for UI features
- Maintain consistent tone and style
- Follow GitHub markdown best practices
