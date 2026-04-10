# Task Design: Clean up ARCHITECTURE.md — remove stale content + update directory tree

**Module:** Documentation (ARCHITECTURE.md — architect-owned)
**Task:** task-1775793599594
**Assignee:** architect (this task is NOT for developer)

## Problem

ARCHITECTURE.md has three issues:
1. Lines 191-252 contain stale CR instructions/addendum notes from prior milestones
2. Directory tree (lines ~130-160) only lists ~14 src/ files but 20+ exist
3. Install section references port 3000 but actual default is 1234

## Files to Modify

- `ARCHITECTURE.md` — architect-owned, tech_lead submits CR

## ⚠️ This task is assigned to architect

As tech_lead, I cannot directly modify ARCHITECTURE.md. I'm documenting the required changes so architect can execute them.

## Required Changes

### 1. Remove stale content (lines 191-252)

Lines starting from "Add sections to ARCHITECTURE.md documenting..." through end of file are accumulated CR instructions that were never cleaned up. Remove all of them.

### 2. Update directory tree

Current tree is missing these verified files:
```
src/
├── config.js                    # MISSING from tree
├── store/
│   └── index.js                 # MISSING from tree
├── runtime/
│   ├── embed.js                 # MISSING from tree
│   ├── profiler.js              # MISSING from tree
│   ├── latency-log.js           # MISSING from tree
│   └── adapters/
│       ├── embed.js             # MISSING from tree
│       ├── sense.js             # MISSING from tree
│       └── voice/
│           ├── elevenlabs.js    # MISSING from tree
│           ├── macos-say.js     # MISSING from tree
│           ├── openai-tts.js    # MISSING from tree
│           ├── openai-whisper.js # MISSING from tree
│           └── piper.js         # MISSING from tree
├── detector/
│   ├── sox.js                   # MISSING from tree
│   └── optimizer.js             # Already listed
├── cli/
│   ├── download-state.js        # MISSING from tree
│   └── (setup.js, browser.js already referenced)
├── tunnel.js                    # MISSING from tree
└── server/
    ├── cert.js                  # MISSING from tree
    ├── httpsServer.js           # MISSING from tree
    └── middleware.js            # MISSING from tree
```

### 3. Fix port references

In the install section, change:
- `http://localhost:3000` → `http://localhost:1234`

## Test Cases

1. No lines containing "Add sections to ARCHITECTURE.md" remain
2. Directory tree includes all 30+ src/ files
3. No references to port 3000 in install section

## ⚠️ Unverified Assumptions

- None. All file paths verified via `find src/` output.
