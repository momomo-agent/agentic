# Task Design: Run Fresh DBB/PRD/Vision Gap Evaluation

## Problem
Gap evaluation files are stale (last updated Apr 7). After M91-M94 fixes, need fresh scores to confirm Vision ≥90% and PRD ≥90%.

## Prerequisites
- task-1775588279635 (test suite fix) completed — pass rate ≥90%
- task-1775588279869 (agentic-sense wiring) completed — all imports clean

## Approach
No source code changes. Pure verification task.

## Steps

### Step 1: Run full test suite
```bash
cd /Users/kenefe/LOCAL/momo-agent/projects/agentic-service
npm test 2>&1 | tail -20
```
Confirm pass rate ≥90%.

### Step 2: Run DBB evaluation
Evaluate architecture match score by checking:
- All modules in ARCHITECTURE.md exist in source (`src/detector/`, `src/runtime/`, `src/server/`, `src/cli/`)
- All exported functions match documented signatures
- External packages (agentic-*) properly wired
- Score = matched requirements / total requirements

### Step 3: Run Vision evaluation
Check feature completeness against VISION.md:
- Hardware detection ✓
- Auto model selection ✓
- Local LLM (Ollama) ✓
- Cloud fallback ✓
- STT/TTS ✓
- Wake word ✓
- Web UI ✓
- Admin panel ✓
- LAN tunnel ✓
- Docker support ✓
- npx install ✓

### Step 4: Run PRD evaluation
Check requirement coverage against PRD.md:
- Cross-reference with implemented modules
- Score = fulfilled requirements / total requirements

### Step 5: Report scores
- Write results to task output or milestone status
- If any score <90%, list specific gaps with file:line references
- If all ≥90%, declare milestone complete

## Files to Read (no modifications)
- `ARCHITECTURE.md`
- `VISION.md` (if exists)
- `PRD.md` (if exists)
- `package.json`
- Source files for spot-checks

## Verification
- [ ] Test pass rate reported: ≥90%
- [ ] DBB score reported: ≥90%
- [ ] Vision score reported: ≥90%
- [ ] PRD score reported: ≥90%
- [ ] Any gaps listed with specific file references
