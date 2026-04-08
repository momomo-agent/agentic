# M94: Technical Design — Architecture Doc Merge + Voice Latency + PRD Gaps

## Overview

M94 is a verification and documentation milestone. It focuses on:
1. Adding 3 undocumented modules to ARCHITECTURE.md and resolving pending CR
2. Verifying voice latency <2s end-to-end via benchmark script
3. Verifying CDN fallback chain and agentic-store integration

M94 involves no new source code — documentation updates + test verification only.

## Task Breakdown

### Task 1: Architecture CR Review & Docs (task-1775587524244)

**3 modules confirmed missing from ARCHITECTURE.md** (verified against source):

| Module | File | Exports |
|--------|------|---------|
| matcher | `src/detector/matcher.js` | `matchProfile(profiles, hardware) → ProfileConfig`, internal `calculateMatchScore(criteria, hardware) → number` |
| ollama | `src/detector/ollama.js` | `ensureOllama(model, onProgress?) → Promise<void>`, internal helpers: `isOllamaInstalled()`, `installOllama()`, `pullModel(model, onProgress)` |
| memory | `src/runtime/memory.js` | `add(text) → Promise<string>`, `remove(key)`/`delete(key)`, `search(query, topK=5) → Array<{id, text, score}>`, uses `cosine(a, b)` |

**Already documented (verified correct):** tunnel.js, cli/setup.js, cli/browser.js, cert.js, httpsServer.js, middleware.js, vad.js, embed.js (in directory tree), store/index.js (in directory tree)

**Actions:**
1. Add matcher.js section with scoring algorithm details
2. Add ollama.js section with install/pull workflow
3. Expand memory.js from directory-tree-only to full API docs
4. Resolve CR-1775569100684 (status → resolved)

### Task 2: Voice Latency Benchmark (task-1775587524323)

**Key files (verified):**
- `scripts/benchmark.js` — benchmark script (exists)
- `test/m19-benchmark.test.js` — validates benchmark structure (exists)
- `src/runtime/stt.js` — `init()` + `transcribe(audioBuffer)`, uses `startMark('stt')`/`endMark('stt')` profiling
- `src/runtime/llm.js` — `async function* chat(msg, opts)`, 3-tier: Ollama → Anthropic → OpenAI fallback
- `src/runtime/tts.js` — `init()` + `synthesize(text)`, adapter selection via hardware profile
- `src/runtime/latency-log.js` — latency recording utility (exists)

**Verification steps:**
1. Confirm `scripts/benchmark.js` calls transcribe/chat/synthesize, uses `Date.now()`, outputs `JSON.stringify`
2. Run `test/m19-benchmark.test.js` — validates benchmark exits 0 when total < 2000ms
3. Profile per-stage: `stt_ms`, `llm_ms`, `tts_ms`, `total_ms`
4. If >2s: document bottleneck stage with recommendation

### Task 3: CDN Fallback + agentic-store (task-1775587524443)

**CDN fallback** (`src/detector/profiles.js` — 4-tier chain):
1. Fresh cache: `~/.agentic-service/profiles.json` within 7-day TTL
2. Remote: `PROFILES_URL` env var or `https://raw.githubusercontent.com/momo-ai/agentic-service/main/profiles/default.json`, 5s timeout
3. Expired cache: use with warning if remote fails
4. Built-in: `profiles/default.json` relative to module

**Tests (verified):** `test/m19-profiles-cdn.test.js`, `test/m30-cdn-profiles.test.js`, `test/m28-profiles-cache.test.js`

**agentic-store** (`src/store/index.js`):
- Wraps `agentic-store` package (in `package.json` dependencies)
- Exports: `get(key)`, `set(key, value)`, `del(key)` with JSON serialization
- Test: `test/m64-agentic-store.test.js` verifies dependency + import

## Dependencies

- M91, M92, M93 — all completed

## Risk

- Voice latency may exceed 2s on CPU-only hardware — document as known limitation, don't block
- agentic-store may fail import in CI — mock if package unavailable
