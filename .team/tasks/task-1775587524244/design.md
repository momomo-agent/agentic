# Task Design: Review and merge Architecture CR for undocumented modules

## Objective
Update ARCHITECTURE.md with 3 confirmed undocumented modules and resolve CR-1775569100684. Target: architecture match 88% → 90%+.

## Existing State
ARCHITECTURE.md already documents sections 1-8 (Detector, Runtime, Server, UI, Tunnel, CLI, VAD, HTTPS/Middleware). **Confirmed missing** from docs: matcher.js, ollama.js, memory.js API. Other modules (tunnel, CLI, cert, httpsServer, middleware, vad, embed, store) are already documented.

## Files to Modify
- `ARCHITECTURE.md` — add 3 missing module sections
- `.team/change-requests/cr-1775569100684.json` — update status to "resolved", set reviewedAt/reviewedBy

## Modules to Add to ARCHITECTURE.md

### 1. matcher.js — add to Detector section (after profiles.js)
```javascript
// src/detector/matcher.js
matchProfile(profiles: ProfilesData, hardware: HardwareInfo) → ProfileConfig
// Scores each profile against hardware using weighted criteria:
//   platform weight=30, gpu weight=30, arch weight=20, minMemory weight=20
// Platform or GPU mismatch → score 0 (candidate eliminated)
// Empty match criteria → score 1 (catch-all default profile)
// Returns highest-scoring profile

// Internal: calculateMatchScore(criteria: MatchCriteria, hardware: HardwareInfo) → number
```

### 2. ollama.js — add to Detector section (after matcher.js)
```javascript
// src/detector/ollama.js
ensureOllama(model: string, onProgress?: (pct: number) => void) → Promise<void>
// Checks if Ollama installed (which ollama), installs if missing:
//   Unix: curl install script
//   Windows: winget install
// Then runs: ollama pull <model> with progress callbacks

// Internal: isOllamaInstalled() → boolean
// Internal: installOllama() → Promise<void>
// Internal: pullModel(model: string, onProgress?: Function) → Promise<void>
```

### 3. memory.js — expand from directory-tree listing to full API
```javascript
// src/runtime/memory.js — KV memory with vector search (via agentic-embed)
add(text: string) → Promise<string>   // embeds text, stores with vector, returns key "mem:<ts>:<random>"
remove(key: string) → Promise<void>   // aliased as delete()
search(query: string, topK?: number=5) → Promise<Array<{id: string, text: string, score: number}>>
// Uses promise-based lock (_lock) for serial writes
// Internal: getIndex(), cosine(a: number[], b: number[]) → number
```

## Already Documented (no changes needed)
- store/index.js (in directory tree)
- embed.js (in directory tree)
- tunnel.js, cli/setup.js, cli/browser.js, cert.js, httpsServer.js, middleware.js, vad.js

## Edge Cases & Error Handling
- CR status: change from "pending" to "resolved" (not "approved" — per CR schema)
- Verify function signatures match actual source exports before writing
- Do NOT remove or modify existing ARCHITECTURE.md sections — only append/add
- Keep Chinese comments consistent with existing style

## Verification
- Grep ARCHITECTURE.md for "matcher", "ollama", "memory" — all present with API signatures
- Grep all `export` statements in src/ and confirm each is traceable in ARCHITECTURE.md
- Architecture match score ≥90%
