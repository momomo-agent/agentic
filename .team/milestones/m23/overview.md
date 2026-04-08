# Milestone 23: Zero-Config Default Browser Filesystem

## Goal
Provide a default in-memory AgenticFileSystem instance out of the box so users don't need to manually instantiate and pass one, fulfilling the zero-config promise.

## Scope
- Export a default `createDefaultFilesystem()` or pre-built instance from `agentic-filesystem`
- Use it as the default value for `AgenticConfig.filesystem` when none is provided
- Update README to reflect zero-config filesystem usage

## Acceptance Criteria
- `ask({ prompt: "...", apiKey: "..." })` works with file_read/file_write without passing `filesystem`
- Default filesystem is an in-memory browser-compatible implementation
- README documents that filesystem is optional (defaults provided)

## Gaps Closed
- Vision: "No default browser filesystem provided out of the box" (missing → implemented)
- PRD: `AgenticConfig.apiKey` required even for `provider='custom'` (partial → fixed)
