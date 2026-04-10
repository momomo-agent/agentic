# agentic-service

Local-first AI service with hardware detection, automatic model optimization, and a built-in Admin UI.

## Quick Start

```bash
npx agentic-service
```

On first run, agentic-service will:
1. Detect your hardware (GPU, VRAM, CPU, memory)
2. Configure Ollama with an optimized model for your system
3. Start the server at `http://localhost:1234`
4. Open the Admin UI in your browser

## Install

```bash
# Run without installing
npx agentic-service

# Install globally
npm i -g agentic-service && agentic-service
```

## CLI Options

```
agentic-service [options]

  -p, --port <port>  server port (default: 1234)
  --no-browser       do not open browser automatically
  --skip-setup       skip first-time setup
  --https            enable HTTPS with self-signed certificate
  -V, --version      output the version number
  -h, --help         display help
```

## Features

- **Hardware-adaptive model selection** — picks the best model and quantization for your GPU/CPU/memory
- **Ollama integration** — auto-detects and configures Ollama
- **OpenAI-compatible API** — drop-in `/v1/chat/completions` and `/v1/models`
- **Anthropic-compatible API** — `/v1/messages` endpoint
- **Speech-to-text / Text-to-speech** — pluggable adapters (OpenAI Whisper, SenseVoice, Kokoro, Piper)
- **Wake word detection** — voice-activated pipeline with VAD
- **Multi-device hub** — WebSocket device registration, heartbeat, cross-device sessions
- **Admin UI** — Vue 3 dashboard for config, models, status, and testing
- **HTTPS support** — self-signed certificates for LAN access
- **Cloud fallback** — automatic failover to Anthropic/OpenAI when Ollama is unavailable
- **Tunnel** — expose your local service to the internet

## API Endpoints

### OpenAI-Compatible

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/models` | List available models |
| POST | `/v1/chat/completions` | Chat completion (streaming supported) |

### Anthropic-Compatible

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/messages` | Messages API (streaming supported) |

### Service API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/chat` | Chat with streaming (SSE) |
| GET | `/api/status` | Hardware, Ollama, and device status |
| GET | `/api/devices` | Connected devices |
| GET | `/api/config` | Read configuration |
| PUT | `/api/config` | Update configuration |
| GET | `/api/models` | List Ollama models |
| POST | `/api/models/pull` | Pull a model (streaming progress) |
| DELETE | `/api/models/:name` | Delete a model |
| POST | `/api/transcribe` | Speech-to-text (multipart audio) |
| POST | `/api/synthesize` | Text-to-speech |
| GET | `/api/logs` | Recent server logs |
| GET | `/api/profiler` | Performance metrics |
| POST | `/api/vad` | Voice activity detection |

## Admin UI

Served at the root URL. Views:

- **Dashboard** — system status, connected devices, Ollama health
- **Config** — LLM provider, model, STT/TTS settings, cloud fallback
- **Models** — browse, pull, and delete Ollama models
- **Status** — hardware detection results and system info
- **Test** — interactive chat playground
- **Examples** — usage examples and API docs

Build the Admin UI separately:

```bash
cd src/ui/admin && npm install && npm run build
```

## Configuration

Config file: `~/.agentic-service/config.json`

Editable via Admin UI (`/config`) or the REST API (`PUT /api/config`).

```json
{
  "llm": {
    "provider": "ollama",
    "model": "gemma2:2b"
  },
  "stt": {
    "provider": "whisper"
  },
  "tts": {
    "provider": "openai-tts"
  },
  "fallback": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514",
    "apiKey": "sk-..."
  }
}
```

### LLM Providers

| Provider | Notes |
|----------|-------|
| `ollama` | Default, local. Model auto-selected by hardware profile |
| `anthropic` | Cloud. Requires `apiKey` |
| `openai` | Cloud. Requires `apiKey` |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key (for STT/TTS and cloud fallback) |
| `ANTHROPIC_API_KEY` | Anthropic API key (for cloud fallback) |
| `PORT` | HTTP port override |
| `WAKE_WORD` | Wake word for voice activation (default: `"hey agent"`) |
| `HTTPS_ENABLED` | Set to `"true"` to enable HTTPS |

## Architecture

```
bin/agentic-service.js       CLI entry point
src/
  cli/                       Setup wizard, browser launch, download state
  detector/                  Hardware detection, model optimization, Ollama management
    hardware.js              GPU/CPU/memory detection
    optimizer.js             Hardware → model config mapping
    profiles.js              CDN-backed hardware profiles
    ollama.js                Ollama install/pull orchestration
  runtime/                   STT, TTS, VAD, sense, profiler, embeddings
    stt.js                   Speech-to-text (adapter-based)
    tts.js                   Text-to-speech (adapter-based)
    vad.js                   Voice activity detection
    sense.js                 Vision sensing pipeline
    profiler.js              Performance instrumentation
    llm.js                   LLM calling engine
  server/                    Express API server
    api.js                   Routes + server lifecycle
    brain.js                 LLM orchestration (Ollama + cloud fallback)
    hub.js                   WebSocket device hub + sessions
  store/                     Persistent KV storage
  tunnel.js                  Internet tunnel
  ui/admin/                  Vue 3 Admin UI
```

## Hardware Requirements

| Hardware | Model | Performance |
|----------|-------|-------------|
| Apple Silicon 16GB+ | gemma4:26b (q8) | Excellent |
| NVIDIA 8GB+ VRAM | gemma4:13b (q4) | Good |
| CPU-only 8GB+ | gemma2:2b (q4) | Basic |

Minimum: Node.js 18+, 8GB RAM. Recommended: 16GB+ RAM, GPU.

## Development

```bash
npm run dev          # Start server (skip setup)
npm test             # Run tests (watch mode)
npm run test:run     # Run tests once
npm run build        # Build Admin UI
```

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

## License

MIT
