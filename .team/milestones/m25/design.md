# M25 Technical Design — Vision Gap Closure: Final 18%

## Overview
Three targeted fixes to close remaining vision gaps. All changes are minimal and isolated.

## Gap 1: Default AgenticFileSystem (task-1775581632597)
`ask.ts` already auto-instantiates `AgenticFileSystem` when `config.filesystem` is absent (line 17). This gap is already closed in the current codebase. Task requires verification only.

## Gap 2: Shell exec browser safety (task-1775581637037)
`shell.ts:executeShell()` already returns a graceful error when `!isNodeEnv()`. Gap is partially closed. Remaining work: README documentation of Node.js-only constraint.

## Gap 3: Search graceful degradation (task-1775581761671)
`search.ts:searchTavily()` and `searchSerper()` throw when no apiKey. Fix: return graceful error object instead of throwing.
- File: `src/tools/search.ts`
- Change `throw new Error(...)` → `return { text: 'Search requires an API key — set toolConfig.search.apiKey', sources: [] }`
