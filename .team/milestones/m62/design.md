# M62 Technical Design — Server VAD + optimizer.js + SIGINT + Docker

## Task 1: Server-side VAD (task-1775526816885)
File: `src/server/api.js`
- In `POST /api/transcribe`: call `detectVoiceActivity(buffer)` before STT
- If no speech detected, return `{ text: '', skipped: true }` immediately

File: `src/runtime/vad.js` (new)
- `detectVoiceActivity(buffer: Buffer): boolean` — compute RMS energy, return true if above threshold

## Task 2: optimizer.js rewrite (task-1775526823938)
File: `src/detector/optimizer.js` — replace current Ollama setup code with:
- `optimize(hardware): { threads: number, memoryLimit: number, model: string }`
- apple-silicon: threads=8, memoryLimit=0.75*memory, model from profile
- nvidia: threads=4, memoryLimit=vram*0.8, model from profile
- cpu-only: threads=cpu.cores, memoryLimit=0.5*memory, model='gemma2:2b'

## Task 3: SIGINT drain (task-1775526823973)
File: `bin/agentic-service.js`
- Track in-flight request count with a counter incremented on request, decremented on response finish
- In `shutdown()`: if counter > 0, wait for `drain` event (or poll) before `process.exit`
- Max wait: 10s then force exit

## Task 4: Docker verification (task-1775526824008)
File: `install/Dockerfile` — verify `HEALTHCHECK` directive present
File: `install/docker-compose.yml` — verify service definition correct
- No code changes needed if build already works; task is verification + fix if broken
