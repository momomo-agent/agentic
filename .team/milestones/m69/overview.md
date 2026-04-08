# M69: DBB Missing Gaps — Server VAD, Optimizer, External Packages, CPU Profile

## Goals
Close remaining DBB partial gaps: server-side VAD, optimizer.js correctness, external package wiring, and cpu-only profile.

## Tasks
- Server-side VAD silence suppression
- optimizer.js hardware-adaptive config output
- agentic-store and agentic-embed external package wiring
- profiles/default.json add cpu-only profile

## Acceptance Criteria
- Server VAD suppresses silence before audio reaches STT/LLM pipeline
- optimizer.js outputs hardware-adaptive config (model size, threads, memory limits), no ollama setup code
- src/store/index.js and src/runtime/embed.js wrap agentic-store and agentic-embed packages
- profiles/default.json includes cpu-only profile alongside apple-silicon and nvidia
