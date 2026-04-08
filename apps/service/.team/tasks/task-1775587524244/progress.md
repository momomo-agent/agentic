# Review and merge Architecture CR for undocumented modules

## Changes Made

### ARCHITECTURE.md
1. **Added matcher.js to Detector section** (lines 37-42):
   - `matchProfile(profiles, hardware) → ProfileConfig` — weighted hardware matching
   - Scoring: platform=30, gpu=30, arch=20, minMemory=20
   - Verified against actual source exports

2. **Added ollama.js to Detector section** (lines 44-49):
   - `ensureOllama(model, onProgress?) → Promise<void>` — auto-install + model pull
   - Unix (curl) / Windows (winget) install strategies
   - Verified against actual source exports

3. **Added memory.js API to Runtime section** (lines 67-71):
   - `add(text) → Promise<void>` — embed + store with vector
   - `remove(key) → Promise<void>` — aliased as `delete()`
   - `search(query, topK?=5) → Promise<Array<{text, score}>>` — vector search
   - Promise-based lock for serial writes

4. **Updated directory tree** (lines 132-133): Added `matcher.js` and `ollama.js` to detector listing

### CR Resolution
- Updated `cr-1775569100684.json`: status pending → resolved, set reviewedAt/reviewedBy

## Verification
- Grep confirms all 3 modules present with API signatures
- Directory tree updated to include matcher.js and ollama.js
- No existing sections were modified — only additions made
