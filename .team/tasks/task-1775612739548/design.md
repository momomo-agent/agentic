# Task Design: Complete ARCHITECTURE.md Directory Structure

## Objective

Update the directory tree in ARCHITECTURE.md (lines 121-155) to accurately reflect all source files that exist in the codebase, closing architecture documentation gaps. Target: ≥95% coverage.

## Files to Modify
- `ARCHITECTURE.md` — lines 121-155 (directory tree section)

## Current State

The documented tree lists 15 source files. The codebase has 51 source files. The tree is missing entire directories and many individual files.

### Missing from tree (high priority — entire directories)

| Missing Path | Files |
|---|---|
| `src/runtime/adapters/` | embed.js, sense.js, voice/openai-tts.js, voice/openai-whisper.js |
| `src/store/` | index.js |
| `src/cli/` | setup.js, browser.js |

### Missing from tree (existing directories, missing files)

| Directory | Missing Files |
|---|---|
| `src/runtime/` | vad.js, embed.js, profiler.js, latency-log.js |
| `src/server/` | cert.js, httpsServer.js, middleware.js |
| `src/` (root) | tunnel.js |

### Missing UI component files (optional — low priority)

| Directory | Missing Files |
|---|---|
| `src/ui/client/src/composables/` | useVAD.js, useWakeWord.js |
| `src/ui/client/src/components/` | PushToTalk.vue, WakeWord.vue |
| `src/ui/admin/src/components/` | ConfigPanel.vue, DeviceList.vue, HardwarePanel.vue, LogViewer.vue, SystemStatus.vue |

**Decision on UI files:** The task description says "complete directory structure" and UI components are real source files. Include them for completeness but keep the tree compact — list components/composables subdirs.

## Updated Directory Tree (exact replacement for lines 121-155)

```text
agentic-service/
├── package.json
├── bin/
│   └── agentic-service.js          # CLI 入口
├── src/
│   ├── detector/
│   │   ├── hardware.js
│   │   ├── profiles.js
│   │   ├── matcher.js
│   │   ├── ollama.js
│   │   └── optimizer.js
│   ├── runtime/
│   │   ├── llm.js
│   │   ├── stt.js
│   │   ├── tts.js
│   │   ├── sense.js
│   │   ├── memory.js
│   │   ├── vad.js
│   │   ├── embed.js
│   │   ├── profiler.js
│   │   ├── latency-log.js
│   │   └── adapters/
│   │       ├── embed.js
│   │       ├── sense.js
│   │       └── voice/
│   │           ├── openai-tts.js
│   │           └── openai-whisper.js
│   ├── store/
│   │   └── index.js
│   ├── server/
│   │   ├── hub.js
│   │   ├── brain.js
│   │   ├── api.js
│   │   ├── cert.js
│   │   ├── httpsServer.js
│   │   └── middleware.js
│   ├── tunnel.js
│   ├── cli/
│   │   ├── setup.js
│   │   └── browser.js
│   └── ui/
│       ├── client/
│       └── admin/
├── profiles/
│   └── default.json
├── install/
│   ├── setup.sh
│   ├── Dockerfile
│   └── docker-compose.yml
└── test/
```

Note: UI client/admin are kept generic (not listing individual Vue components) to match the existing style. The important additions are runtime/, store/, server/, tunnel.js, and cli/ files.

## Implementation Steps

1. Read ARCHITECTURE.md, identify exact lines for the directory tree block (lines 121-155)
2. Replace the entire tree block with the updated version above
3. Preserve all surrounding content (sections before and after)

## Edge Cases
- `install/`, `profiles/`, `test/` directories — keep as-is, they exist
- `package-lock.json` in ui/client and ui/admin — omit (auto-generated)
- `tunnel.js` is at `src/tunnel.js` (root of src/), NOT under `src/server/`

## Verification
```bash
# Count documented files vs actual files
find src bin -name '*.js' -o -name '*.ts' -o -name '*.vue' | grep -v node_modules | grep -v dist | wc -l
# Compare tree output against ARCHITECTURE.md tree
# Target: ≤2 unlisted files (only auto-generated artifacts)
```

## Dependencies
None — pure documentation task.
