# Milestone 16: Public API Exports & Provider Docs

## Goals
Close remaining partial architecture gaps around public API surface and undocumented behavior.

## Scope
1. Export ShellResult from src/index.ts
2. Export shellToolDef/executeShell from tools/index.ts
3. Document custom provider fallback behavior in README/ARCHITECTURE.md

## Acceptance Criteria
- ShellResult is importable from the package root
- shellToolDef and executeShell are exported from tools/index.ts
- Custom provider fallback (baseUrl without customProvider) is documented
