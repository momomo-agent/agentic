# Design: Verify agentic-filesystem dependency weight

## Goal
Confirm `agentic-filesystem` (linked peer dep) does not violate the "no heavy runtime" constraint and is browser-compatible.

## Files to Create/Modify
- `.team/tasks/task-1775562222342/artifacts/dependency-audit.md` — findings document

## Steps

### 1. Measure install size
```bash
du -sh ../agentic-filesystem/dist/
du -sh ../agentic-filesystem/node_modules/ 2>/dev/null || echo "no node_modules"
```

### 2. Check for Node-only deps
```bash
cat ../agentic-filesystem/package.json  # already confirmed: no deps, no peerDeps
grep -r "require('fs')\|require('path')\|require('child_process')" ../agentic-filesystem/src/ || echo "no Node-only imports"
```

### 3. Confirm browser compatibility
- No `fs`, `path`, `child_process`, `os` imports in source
- Exports only pure JS/TS with no Node built-ins

### 4. Document findings
Write results to `artifacts/dependency-audit.md`:
```
# agentic-filesystem Dependency Audit

- Install size: <measured>
- Node-only deps: none / list
- Browser-compatible: yes / no
- Verdict: PASS / FAIL — <reason>
```

## Edge Cases
- If Node-only imports found → raise CR to replace with browser-safe alternative
- If size > 500KB unpacked → flag as potential violation

## Test Cases
- `pnpm test` still passes after audit (no code changes expected)
- Audit doc exists at `artifacts/dependency-audit.md`
