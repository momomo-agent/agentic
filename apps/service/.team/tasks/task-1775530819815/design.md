# Design: Confirm agentic-sense wrapping in runtime/sense.js

## File
`src/runtime/sense.js`

## Approach
1. Read `sense.js` and check if it imports from `agentic-sense`
2. If local stub: replace with import from `agentic-sense` (MediaPipe wrapper)
3. If package unavailable in node_modules: submit CR to architecture

## Acceptance Criteria
- `src/runtime/sense.js` delegates to `agentic-sense` package
- OR a CR is filed if package is unavailable
