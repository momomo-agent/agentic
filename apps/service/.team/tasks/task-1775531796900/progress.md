# Progress: Wire agentic-embed in runtime/embed.js

## Completed
- Created `src/runtime/adapters/embed.js` with stub implementation that throws "not implemented" error
- Added `agentic-embed: "*"` to package.json dependencies
- Added `agentic-embed: "./src/runtime/adapters/embed.js"` to package.json imports map

## Implementation Details
- The adapter stub follows the same pattern as other adapters (sense.js, voice adapters)
- `src/runtime/embed.js` already had the correct implementation (validates input, calls adapter)
- Edge cases are handled in runtime/embed.js before calling the adapter:
  - Empty string returns []
  - Non-string throws TypeError
  - Adapter errors propagate to caller

## Files Modified
- `src/runtime/adapters/embed.js` (created)
- `package.json` (dependencies and imports map updated)

## Status
Ready for review. All changes match the design specification.
