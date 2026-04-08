# agentic-service

One-command AI agent service with automatic hardware detection and optimization.

## Features

- One-command install: `npx agentic-service`
- Automatic hardware detection (GPU, CPU, memory)
- Optimized model selection based on your hardware
- Voice capabilities (STT + TTS)
- Vision sensing (face, gesture, object detection)
- LLM-powered conversation with tool use
- Docker support for easy deployment
- Modular architecture with external packages

## Install

```bash
# Run without installing
npx agentic-service

# Install globally
npm i -g agentic-service && agentic-service

# Docker
docker run -p 3000:3000 momomo/agentic-service
```

## Quick Start

On first run, agentic-service will:
1. Detect your hardware (GPU, VRAM, CPU, OS)
2. Pull the recommended Ollama model for your hardware
3. Open the chat UI in your browser at `http://localhost:3000`

## Environment Variables

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | Cloud fallback via OpenAI |
| `ANTHROPIC_API_KEY` | Cloud fallback via Anthropic |
| `PORT` | HTTP port (default: `3000`) |
| `PROFILES_URL` | Override CDN URL for hardware profiles JSON |
| `WAKE_WORD` | Wake word for voice activation (default: `"hey agent"`) |

## API Reference

### `POST /api/chat`

SSE stream. Send a message, receive a streamed response.

```
POST /api/chat
Content-Type: application/json

{ "message": "Hello", "history": [] }
```

Response: `text/event-stream` with `data: <token>` lines.

---

### `POST /api/transcribe`

Transcribe audio to text.

```
POST /api/transcribe
Content-Type: multipart/form-data

file=<audio file>
```

Response:
```json
{ "text": "transcribed text" }
```

---

### `POST /api/synthesize`

Synthesize text to audio.

```
POST /api/synthesize
Content-Type: application/json

{ "text": "Hello world" }
```

Response: audio buffer (`audio/wav`).

---

### `GET /api/status`

Returns current hardware, profile, and connected devices.

```json
{
  "hardware": { "gpu": "apple_silicon", "vram": 16, "cpu": "arm64", "os": "darwin" },
  "profile": { "model": "llama3.2", "contextSize": 4096 },
  "devices": []
}
```

---

### `GET /api/config`

Returns current configuration.

```json
{
  "port": 3000,
  "model": "llama3.2",
  "cloudFallback": { "enabled": false }
}
```

---

### `PUT /api/config`

Update configuration (partial update supported).

```
PUT /api/config
Content-Type: application/json

{ "model": "mistral" }
```

Response: updated config JSON.

---

## Docker Deployment

```bash
# Single container
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=sk-... \
  -v ~/.agentic-service:/root/.agentic-service \
  momomo/agentic-service
```

```yaml
# docker-compose.yml
services:
  agentic-service:
    image: momomo/agentic-service
    ports:
      - "3000:3000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ~/.agentic-service:/root/.agentic-service
```

## UI

| Route | Description |
|---|---|
| `/` | Chat interface |
| `/admin` | Admin panel (devices, config, logs) |

## Profiles

Hardware profiles are loaded from `profiles/default.json` (or fetched from CDN). Each profile matches hardware and sets providers:

| Field | Description |
|---|---|
| `match.platform` | `"darwin"`, `"linux"`, `"win32"` |
| `match.gpu` | `"apple-silicon"`, `"nvidia"`, `"cpu"` |
| `match.minMemory` | Minimum RAM in GB |
| `config.llm` | LLM provider + model + quantization |
| `config.stt` | Speech-to-text provider + model |
| `config.tts` | Text-to-speech provider + voice |
| `config.fallback` | Cloud fallback provider + model |

## Configuration

Config file: `~/.agentic-service/config.json`

```json
{
  "port": 3000,
  "model": "auto",
  "cloudFallback": {
    "enabled": false,
    "provider": "openai",
    "model": "gpt-4o-mini",
    "timeoutMs": 5000
  },
  "wakeWord": null,
  "vad": false
}
```

| Field | Default | Description |
|---|---|---|
| `port` | `3000` | HTTP listen port |
| `model` | `"auto"` | Ollama model name, or `"auto"` to use hardware profile |
| `cloudFallback.enabled` | `false` | Fall back to cloud LLM on local failure |
| `cloudFallback.provider` | `"openai"` | `"openai"` or `"anthropic"` |
| `cloudFallback.timeoutMs` | `5000` | Local timeout before fallback triggers |
| `wakeWord` | `null` | Wake word for voice activation (e.g. `"hey momo"`) |
| `vad` | `false` | Enable voice activity detection |

## Troubleshooting

| Problem | Solution |
|---|---|
| Ollama not found | Install from https://ollama.ai or run `brew install ollama` |
| Port in use | Set `PORT=3001` env var or update `~/.agentic-service/config.json` |
| No microphone | Check browser permissions or use text-only mode via `/api/chat` |

## Hardware Requirements

| Hardware | Model | Performance |
|----------|-------|-------------|
| Apple Silicon (32GB+) | gemma2:27b | Excellent |
| Apple Silicon (16GB+) | gemma2:9b | Good |
| NVIDIA (8GB+ VRAM) | gemma2:9b | Good |
| CPU-only | gemma2:2b | Basic |

Minimum: 4-core CPU, 8GB RAM, 10GB disk. Recommended: 8+ cores, 16GB+ RAM, GPU.

## Architecture

```
agentic-service
├── agentic-core      # LLM calling engine (streaming, tool use, retry)
├── agentic-sense     # MediaPipe sensing (face/gesture/object)
├── agentic-voice     # TTS + STT unified interface
├── agentic-store     # KV storage abstraction
└── agentic-embed     # Vector embedding (bge-m3)
```

```
agentic-service/
├── bin/agentic-service.js    # CLI entry point
├── src/
│   ├── detector/             # Hardware detection
│   ├── runtime/              # Service runtimes (llm, stt, tts, sense, memory)
│   ├── server/               # HTTP server (hub, brain, api)
│   └── ui/                   # Web UI (client, admin)
├── profiles/default.json     # Hardware profiles
└── install/                  # Dockerfile, docker-compose, setup.sh
```

## Development

```bash
git clone https://github.com/momomo/agentic-service.git
cd agentic-service
npm install
npm test
npm start
```

## License

MIT

