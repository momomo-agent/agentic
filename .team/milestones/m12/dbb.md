# M12 DBB — Public API Surface & Architecture Spec

## DBB-001: ShellResult exported from src/index.ts
- `import { ShellResult } from 'agentic-lite'` resolves without error
- Type is identical to the interface in types.ts

## DBB-002: shellToolDef and executeShell exported from tools/index.ts
- `import { shellToolDef, executeShell } from 'agentic-lite/tools'` (or internal path) resolves
- Both are present in `src/tools/index.ts` exports

## DBB-003: AgenticResult.images is string[] (never undefined)
- `AgenticResult.images` type is `string[]`, not `string[] | undefined`
- ask() always returns `images: []` when no images collected

## DBB-004: ARCHITECTURE.md exists at project root
- File exists at `/ARCHITECTURE.md`
- Documents: module structure, data flow, key interfaces
