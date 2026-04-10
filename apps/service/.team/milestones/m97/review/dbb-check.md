# M97 DBB Check — 2026-04-10 (fresh evaluation)

## Global DBB Match: 72% (down from 75% — new Docker port mismatch gap found)

### Goal Status
- **Vision: 91%+** (≥90% target met)
- **PRD: 95%** (≥90% target met)
- Project goal **Vision ≥90% + PRD ≥90%: ACHIEVED**

### M97 Milestone Score: 70% (7/10 pass, up from 60%)

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| M97-1 | Dir structure ≥95% coverage | FAIL | Tree lists ~14 src/ files; 34+ exist. Missing: embed.js, vad.js, profiler.js, latency-log.js, store/index.js, adapters/*, cli/*, tunnel.js, cert.js, httpsServer.js, middleware.js |
| M97-2 | No stale CR content | FAIL | Lines 191-252 contain ~60 lines of repeated CR artifacts from prior milestones |
| M97-3 | vision.json/prd.json match reality | PASS | Confirmed accurate via fresh monitor runs |
| M97-4 | Vision ≥90% | PASS | 91%+ |
| M97-5 | PRD ≥90% | PASS | 95% |
| M97-6 | Fresh dbb.json run | PASS | Updated with 11 gaps, match 72% |
| M97-7 | 4 agentic-* packages resolve | PASS | All 4 in package.json deps; zero #agentic import map refs in src/ |
| M97-8 | Test pass rate ≥90% | PASS | 96.2% (810/845 pass, 32 fail across 16 test files) |
| M97-9 | src/index.js exists | FAIL | File does not exist; package.json main still points to it |
| M97-10 | README port = code port | PASS | README now correctly shows port 1234 |

### Changes vs Prior Assessment (2026-04-08)

- **README port fixed** — now shows 1234, M97-10 flipped to PASS
- **Test pass rate improved** — 96.2% (810/845) up from ~94% (775/824)
- **Sense adapter no longer a stub** — `createPipeline()` delegates to agentic-sense, `detect()` returns real data. Removed from gap list.
- **mDNS gap removed** — not a DBB requirement, was over-counted
- **New gap found**: Docker port mismatch — docker-compose.yml exposes 3000 but app defaults to 1234
- **New gap found**: ARCHITECTURE.md install section references port 3000 and localhost:3000

### Unresolved Global Gaps (11 total)

**Critical (2):**
1. `src/index.js` missing — `package.json "main"` points to non-existent file
2. Docker port mismatch — docker-compose.yml exposes 3000, app defaults to 1234

**Major (5):**
3. ARCHITECTURE.md stale CR content — lines 191-252 are CR artifacts
4. ARCHITECTURE.md incomplete directory tree — ~41% file coverage
5. Dead import maps `#agentic-embed` and `#agentic-voice` in package.json
6. Test failures: 32 tests across 16 files (server-layer brain.js, hub-brain-api, rest-api-endpoints)
7. ARCHITECTURE.md install section shows port 3000 (inconsistent with actual 1234)

**Minor (4):**
8. Stub embed adapter — `adapters/embed.js` throws 'not implemented'
9. Docker missing OLLAMA_HOST env var
10. Docker missing data volume mount in root docker-compose.yml
11. Server middleware is 4-line error handler only

### Recommendation

Project functional goals (Vision ≥90% + PRD ≥90%) are met. To push DBB above 90%, fix these high-impact items:
1. Create `src/index.js` re-exporting from actual entry point (critical)
2. Fix Docker port to 1234 in docker-compose.yml files (critical)
3. Clean ARCHITECTURE.md: delete lines 191-252, expand directory tree, fix port refs
4. Remove dead import maps from package.json
5. Fix remaining 32 test failures (mostly stale mocks in brain.js/hub tests)
