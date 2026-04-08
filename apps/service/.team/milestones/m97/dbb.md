# M97 DBB — Architecture Doc Polish + Remaining Gap Closure

## Milestone Goal
Push Vision 72% → ≥90% and PRD 78% → ≥90% by completing architecture docs, cleaning stale content, updating gap statuses, and running fresh evaluations.

---

## 1. ARCHITECTURE.md Directory Structure Complete (task-1775612739548)

**Requirement:** Directory tree in ARCHITECTURE.md matches actual codebase files.

**Verification:**
- [ ] `src/runtime/embed.js` listed in directory tree
- [ ] `src/runtime/vad.js` listed in directory tree
- [ ] `src/runtime/profiler.js` listed (if exists in codebase)
- [ ] `src/runtime/latency-log.js` listed (if exists in codebase)
- [ ] `src/runtime/adapters/` listed in directory tree
- [ ] `src/store/` listed in directory tree
- [ ] `src/tunnel.js` listed in directory tree
- [ ] `src/cli/setup.js` and `src/cli/browser.js` listed
- [ ] `src/server/cert.js`, `httpsServer.js`, `middleware.js` listed
- [ ] Diff between `find src -name '*.js'` and ARCHITECTURE.md tree shows ≤2 unlisted files

**Acceptance:** ARCHITECTURE.md directory tree covers ≥95% of actual source files

---

## 2. Stale CR Content Removed + Missing Sections Added (task-1775612739625)

**Requirement:** ARCHITECTURE.md has no stale CR text; all implemented modules have documentation sections.

**Verification:**
- [ ] Lines 191+ contain no CR text (no JSON blocks, no "Add sections to ARCHITECTURE.md" instructions)
- [ ] Section 9 (agentic-embed) present: embed(text) → number[], adapters/, bge-m3, memory.js integration
- [ ] Section for profiler/latency-log modules present (if they exist in codebase)
- [ ] Section for tunnel.js present: startTunnel(port), ngrok/cloudflared preference
- [ ] Section for CLI module present: runSetup(), openBrowser(port)
- [ ] Section for HTTPS/middleware present: generateCert(), createHttpsServer(), errorHandler()
- [ ] Section for VAD present: detectVoiceActivity(buffer) → boolean, RMS threshold
- [ ] `wc -l ARCHITECTURE.md` shows no CR artifacts after the last module section

**Acceptance:** ARCHITECTURE.md is clean, complete, and has no stale content

---

## 3. Vision/PRD Gap Statuses Updated (task-1775612739836)

**Requirement:** vision.json and prd.json reflect actual implementation state.

**Verification:**
- [ ] Each "partial" item in vision.json verified against source code
- [ ] Each "partial" item in prd.json verified against source code
- [ ] Items with confirmed implementation marked as "implemented"
- [ ] Items with confirmed absence kept as "partial" or "missing"
- [ ] CDN fallback: verify profiles.js has timeout/fallback logic → mark accordingly
- [ ] Cross-device brain state: verify hub.js broadcastSession → mark accordingly
- [ ] Wake word: verify if server-side pipeline exists or is client-only → mark accordingly
- [ ] Cloud fallback: verify llm.js has OpenAI/Anthropic fallback → mark accordingly
- [ ] npx entrypoint: verify bin/agentic-service.js exists and works → mark accordingly
- [ ] External packages: verify all 4 agentic-* resolve from package.json → mark accordingly
- [ ] HTTPS/LAN tunnel: verify cert.js + tunnel.js completeness → mark accordingly
- [ ] Config hot-update: verify watchProfiles or equivalent → mark accordingly
- [ ] Docker/README: verify existence → mark accordingly

**Acceptance:** vision.json and prd.json gap statuses match reality

---

## 4. Final Gap Re-evaluation (task-1775612739945)

**Requirement:** Fresh evaluation confirms Vision ≥90% and PRD ≥90%.

**Verification:**
- [ ] Fresh vision.json evaluation run, match score recorded
- [ ] Fresh prd.json evaluation run, match score recorded
- [ ] Fresh architecture.json evaluation run, match score recorded
- [ ] Fresh dbb.json evaluation run, match score recorded
- [ ] Vision match score ≥90%
- [ ] PRD match score ≥90%
- [ ] If any score <90%, specific remaining gaps listed with file/line references
- [ ] Evaluation uses current HEAD (post all M97 fixes)
- [ ] Scores documented in task output

**Acceptance:** Vision ≥90% AND PRD ≥90%

---

## Summary

| # | Criterion | Measurable | Target |
|---|-----------|------------|--------|
| 1 | Dir structure coverage | Files listed / files exist | ≥95% |
| 2 | Stale CR content | Lines with CR artifacts | 0 |
| 3 | Missing sections | Undocumented modules | 0 |
| 4 | Vision match score | vision.json match | ≥90% |
| 5 | PRD match score | prd.json match | ≥90% |
| 6 | Architecture match | architecture.json match | ≥90% |
