# M94: DBB — Verification Criteria

## Milestone Goal
Close remaining architecture and Vision/PRD gaps to achieve Vision ≥90% and Architecture ≥90%.

---

## 1. Architecture Documentation — Missing Modules (task-1775587524244)

**Requirement:** ARCHITECTURE.md documents the 3 modules confirmed missing from docs:

**Verification:**
- [ ] `src/detector/matcher.js` documented: `matchProfile(profiles, hardware)` with scoring weights (platform:30, gpu:30, arch:20, minMemory:20) and `calculateMatchScore()` internal helper
- [ ] `src/detector/ollama.js` documented: `ensureOllama(model, onProgress)` with install flow (curl/winget) and `pullModel()` internal helper
- [ ] `src/runtime/memory.js` API documented: `add(text)`, `remove(key)`/`delete(key)`, `search(query, topK=5)` with types — currently only listed in directory tree
- [ ] CR-1775569100684 status changed from "pending" to "resolved"

**Already documented** (verified correct): tunnel.js, cli/setup.js, cli/browser.js, cert.js, httpsServer.js, middleware.js, vad.js

**Acceptance:** Architecture match score ≥90% after additions

---

## 2. Voice Latency <2s End-to-End (task-1775587524323)

**Requirement:** STT + LLM + TTS pipeline latency <2s verified.

**Verification:**
- [ ] `scripts/benchmark.js` exists and calls `transcribe()`, `chat()`, `synthesize()` in sequence
- [ ] `test/m19-benchmark.test.js` passes (validates benchmark script structure)
- [ ] Per-stage latencies measured: `stt_ms`, `llm_ms`, `tts_ms`, `total_ms`
- [ ] Script exits 0 when total < 2000ms, exits 1 when ≥2000ms
- [ ] If latency >2s: bottleneck stage identified and documented
- [ ] Output includes `JSON.stringify` with timing data

**Key modules:** `src/runtime/stt.js` (init + transcribe), `src/runtime/llm.js` (chat with Ollama→cloud fallback), `src/runtime/tts.js` (init + synthesize)

---

## 3. CDN Fallback Verification (task-1775587524443)

**Requirement:** 4-tier fallback chain verified when primary CDN is unreachable.

**Verification:**
- [ ] Fresh cache tier works: `~/.agentic-service/profiles.json` within 7-day TTL
- [ ] Remote fetch works: `PROFILES_URL` env var or default GitHub raw URL, 5s timeout
- [ ] Expired cache fallback works: remote fails + expired cache exists → use with warning
- [ ] Built-in fallback works: `profiles/default.json` used when all else fails
- [ ] Unreachable `PROFILES_URL` → returns valid profile from cache/builtin, no crash
- [ ] `test/m19-profiles-cdn.test.js` and `test/m30-cdn-profiles.test.js` pass

---

## 4. agentic-store Integration (task-1775587524443)

**Requirement:** `src/store/index.js` init/query work end-to-end.

**Verification:**
- [ ] `src/store/index.js` imports `agentic-store` (verified in `package.json` dependencies)
- [ ] `init()` creates/connects to storage backend without error
- [ ] `query()` returns results after init
- [ ] `test/m64-agentic-store.test.js` passes (verifies dependency + import)
- [ ] No import resolution errors at runtime

---

## Summary

| # | Criterion | Measurable | Target |
|---|-----------|------------|--------|
| 1 | Missing modules documented | matcher, ollama, memory in ARCHITECTURE.md | 3/3 |
| 2 | CR resolved | cr-1775569100684 status | resolved |
| 3 | Voice latency | benchmark.js total_ms | <2000ms |
| 4 | CDN fallback | Unreachable URL → valid profile | Pass |
| 5 | agentic-store | init + query end-to-end | Pass |
| 6 | Architecture match | Doc coverage score | ≥90% |
