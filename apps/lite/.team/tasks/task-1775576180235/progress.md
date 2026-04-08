# Progress

## Done
- Added `import { AgenticFileSystem, MemoryStorage } from 'agentic-filesystem'` to ask.ts
- Added default filesystem: `config.filesystem ?? new AgenticFileSystem({ storage: new MemoryStorage() })`
- All downstream tool calls use `resolvedConfig` which always has a filesystem
- Build passes
