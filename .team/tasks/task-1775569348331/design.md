# Task Design — Wire agentic-sense as External Package Dependency

## Problem

`package.json` has `"agentic-sense": "*"` in dependencies (will fail in Docker — not on npm registry), and the `imports` map has no `#agentic-sense` entry. `src/runtime/adapters/sense.js` imports directly from `'agentic-sense'` (bare specifier, no import map alias).

## Changes Required

### 1. `package.json`

**Dependencies** — replace `"agentic-sense": "*"` with tarball reference (consistent with M86 Docker fix approach):

```json
"agentic-sense": "file:./vendor/agentic-sense.tgz"
```

**Imports map** — add `#agentic-sense` alias:

```json
"imports": {
  "#agentic-embed": "./src/runtime/adapters/embed.js",
  "#agentic-voice": "./src/runtime/adapters/voice/openai-tts.js",
  "#agentic-sense": "./src/runtime/adapters/sense.js"
}
```

### 2. `src/runtime/adapters/sense.js`

No change needed — already imports from `'agentic-sense'` package directly. The import map alias `#agentic-sense` points to this adapter, so callers use `#agentic-sense` and the adapter resolves to the real package.

### 3. `install/docker-build.sh`

Already includes `agentic-sense` in the pack loop per M86 design — no change needed.

## Files to Modify

| File | Change |
|------|--------|
| `package.json` | `"agentic-sense": "file:./vendor/agentic-sense.tgz"` + add `#agentic-sense` to imports |

## Edge Cases

- `vendor/agentic-sense.tgz` must exist before `npm install` — ensured by `docker-build.sh`
- Any existing code importing `'agentic-sense'` directly (not via `#agentic-sense`) still works since the package is installed; the import map alias is additive

## Test Cases

1. `npm install` resolves `agentic-sense` from `file:./vendor/agentic-sense.tgz` without 404
2. `import { createPipeline } from '#agentic-sense'` resolves to `src/runtime/adapters/sense.js`
3. `docker build -f install/Dockerfile .` exits 0 with no 404 for agentic-sense
