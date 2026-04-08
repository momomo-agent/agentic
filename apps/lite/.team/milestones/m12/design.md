# M12 Technical Design — Public API Surface & Architecture Spec

## Goal
Complete the public API surface by exporting missing shell types/tools, fixing the `images` type, and documenting the architecture.

## Tasks

### 1. Fix public API exports (task-1775565504597)
- Add `ShellResult` to `src/index.ts` type exports
- Add `shellToolDef`, `executeShell` to `src/tools/index.ts`

### 2. Fix AgenticResult.images type (task-1775565517510)
- Change `images?: string[]` → `images: string[]` in `src/types.ts`
- Update `ask.ts` return to always pass `images: allImages` (already does — verify)

### 3. Create ARCHITECTURE.md (task-1775565533987)
- Document module structure, data flow, and key interfaces at project root
