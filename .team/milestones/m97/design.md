# M97: Technical Design — Architecture Doc Polish + Remaining Gap Closure

## Overview

M97 is the final milestone to achieve Vision ≥90% + PRD ≥90%. Four tasks work together to close documentation and scoring gaps:

1. Complete ARCHITECTURE.md directory structure (doc-only)
2. Clean stale CR content + add missing sections (doc-only)
3. Update Vision/PRD gap statuses (gap file updates)
4. Run fresh gap re-evaluation (verification-only)

## Current State Analysis

**Scores (as of Apr 7):**
- Vision: 72% (19 items, 10 implemented, 7 partial, 2 missing)
- PRD: 78% (18 items, 10 implemented, 6 partial, 2 missing)
- Architecture: 88% (8 items, 1 implemented, 6 partial, 1 missing)
- DBB: 75% (16 items, 12 implemented, 2 partial, 2 missing)

**Key insight:** Many "partial" items were completed in M76-M95 but gap files were never updated. The actual implementation is ahead of the scoring.

## Task Breakdown

### Task 1: Complete ARCHITECTURE.md Directory Structure (task-1775612739548)

**Files to modify:**
- `ARCHITECTURE.md` — lines 121-155 directory tree section

**What to add to the directory tree:**
```
│   ├── runtime/
│   │   ├── llm.js
│   │   ├── stt.js
│   │   ├── tts.js
│   │   ├── sense.js
│   │   ├── memory.js
│   │   ├── vad.js          # ADD
│   │   ├── embed.js         # ADD
│   │   ├── profiler.js      # ADD (if exists)
│   │   ├── latency-log.js   # ADD (if exists)
│   │   └── adapters/        # ADD
│   │       ├── sense.js
│   │       └── embed.js
│   ├── store/               # ADD
│   │   └── index.js
│   ├── tunnel.js            # ADD (or under server/)
│   ├── cli/                 # ADD
│   │   ├── setup.js
│   │   └── browser.js
│   ├── server/
│   │   ├── hub.js
│   │   ├── brain.js
│   │   ├── api.js
│   │   ├── cert.js          # ADD
│   │   ├── httpsServer.js   # ADD
│   │   └── middleware.js    # ADD
```

**Algorithm:**
1. Run `find src -name '*.js' -o -name '*.ts' | sort` to get actual file list
2. Compare with ARCHITECTURE.md tree
3. Add missing entries to tree
4. Verify completeness

### Task 2: Clean Stale CR Content + Add Missing Sections (task-1775612739625)

**Files to modify:**
- `ARCHITECTURE.md` — remove lines 191+ CR content, add sections

**Content to remove:** Lines 191-251 (stale CR text appended at end)

**Sections to add:**

```javascript
// Section 9: agentic-embed (Vector Embedding)
// src/runtime/embed.js
embed(text: string) → Promise<number[]>  // bge-m3 vector embedding
// Throws TypeError if text is not a string
// Returns empty array for empty string
// Used by memory.js for semantic search / retrieval

// src/runtime/adapters/embed.js
// Adapter wrapping agentic-embed package
// Converts model output to float32 array
```

```javascript
// Section 10: Tunnel (LAN/WAN Exposure)
// src/tunnel.js
startTunnel(port: number) → void
// Prefers ngrok if installed, falls back to cloudflared
// Handles SIGINT to kill subprocess cleanly
```

```javascript
// Section 11: CLI Module
// src/cli/setup.js
runSetup() → Promise<void>
// First-run wizard: detect hardware, pull profile, install Ollama, pull model

// src/cli/browser.js
openBrowser(port: number) → void
// Opens default browser to http://localhost:<port>
```

```javascript
// Section 12: HTTPS & Middleware
// src/server/cert.js
generateCert() → { key: string, cert: string }
// Generates self-signed cert via selfsigned package

// src/server/httpsServer.js
createHttpsServer(app: Express, options?: Object) → https.Server

// src/server/middleware.js
errorHandler(err: Error, req: Request, res: Response, next: Function) → void
```

```javascript
// Section 13: VAD (Voice Activity Detection)
// src/runtime/vad.js
detectVoiceActivity(buffer: Buffer) → boolean
// RMS energy threshold (0.01). Returns true if audio contains speech.
// Operates on Int16 PCM data
```

```javascript
// Section 14: Profiler & Latency (if exists)
// src/runtime/profiler.js
// src/runtime/latency-log.js
```

**Algorithm:**
1. Locate stale CR content boundary (look for "Add sections to ARCHITECTURE.md" pattern)
2. Remove everything from that line to EOF
3. Append new sections before EOF
4. Verify no duplicate sections exist earlier in file

### Task 3: Verify and Update Vision/PRD Gap Statuses (task-1775612739836)

**Files to modify:**
- `.team/gaps/vision.json` — update gap statuses
- `.team/gaps/prd.json` — update gap statuses

**Verification checklist per gap item:**

| Gap Item | Check Command | Expected Result |
|----------|---------------|-----------------|
| CDN fallback | Check `src/detector/profiles.js` for timeout/fallback | Has fallback to default.json |
| Cross-device brain state | Check `src/server/hub.js` for broadcastSession | Has joinSession/broadcastSession |
| Wake word server-side | Check `src/runtime/sense.js` for startWakeWordPipeline | Determine if stub or real |
| Cloud fallback | Check `src/runtime/llm.js` for OpenAI/Anthropic fallback | Has provider switch logic |
| npx entrypoint | Check `bin/agentic-service.js` exists | File exists with proper shebang |
| External packages | Check `package.json` for all 4 agentic-* deps | All present with file: refs |
| HTTPS/LAN tunnel | Check `src/server/cert.js` + `src/tunnel.js` | Both exist |
| Config hot-update | Check `src/detector/profiles.js` for watchProfiles | Has watch or reload logic |
| Docker files | Check `install/Dockerfile` | File exists |
| README | Check `README.md` | File exists |
| Voice latency | Check `src/runtime/profiler.js` or latency-log.js | Determine if enforced |

**Algorithm:**
1. For each "partial" or "missing" item in vision.json:
   - Read the referenced source file
   - Determine if implementation is complete
   - Update status to "implemented" or leave as "partial"/"missing"
2. Repeat for prd.json
3. Recalculate match scores:
   - Vision: (implemented / total) * 100
   - PRD: (implemented / total) * 100

### Task 4: Final Gap Re-evaluation (task-1775612739945)

**Files to read/modify:**
- `.team/gaps/vision.json` — read for final score
- `.team/gaps/prd.json` — read for final score
- `.team/gaps/architecture.json` — read for final score
- `.team/gaps/dbb.json` — read for final score

**Algorithm:**
1. Wait for Tasks 1-3 to complete (blocked by them)
2. Read all 4 gap files
3. Report scores:
   - Vision: {score}% (target: ≥90%)
   - PRD: {score}% (target: ≥90%)
   - Architecture: {score}%
   - DBB: {score}%
4. If Vision <90%: list specific gaps preventing ≥90%
5. If PRD <90%: list specific gaps preventing ≥90%
6. Output structured summary for milestone status

**Output format:**
```
## Gap Re-evaluation Results

| Metric | Score | Target | Status |
|--------|-------|--------|--------|
| Vision | XX%   | ≥90%   | PASS/FAIL |
| PRD    | XX%   | ≥90%   | PASS/FAIL |
| Architecture | XX% | ≥90% | PASS/FAIL |
| DBB    | XX%   | ≥90%   | PASS/FAIL |

### Remaining Gaps (if any):
- [gap description] — [status] — [what's needed]
```

## Dependencies

- Task 3 depends on Tasks 1+2 (architecture docs should be clean before re-evaluating)
- Task 4 depends on all Tasks 1-3
- Tasks 1 and 2 can run in parallel (both edit ARCHITECTURE.md but different sections)

## Risk

- Tasks 1 and 2 both modify ARCHITECTURE.md — coordinate to avoid merge conflicts
- Some "partial" items may reveal real implementation gaps, not just doc gaps
- If after all updates Vision/PRD still <90%, remaining gaps need new tasks
