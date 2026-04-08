# Add symlink support to NodeFsBackend

## Status: Complete

## Changes
- `src/backends/node-fs.ts`: Added `realpath` import, updated `walk()` to handle symlinks with cycle detection via visited set
- Broken symlinks skipped silently, circular symlinks skipped via visited set
- Build: success
