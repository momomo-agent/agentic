# Implement basic permissions system

## Status: Complete

## Changes
- `src/types.ts`: Added `Permission` interface, `permissions` field to `FileSystemConfig`
- `src/filesystem.ts`: Added `setPermission()`, `checkPermission()`, enforcement in `read()`/`write()`/`delete()`
- `src/index.ts`: Exported `Permission` type

## Notes
- Exact path match takes priority over prefix match
- `readOnly` still blocks writes regardless of permissions
- Build: success
