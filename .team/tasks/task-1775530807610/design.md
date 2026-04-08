# Design: Wire agentic-embed external package

## File
`src/runtime/embed.js`

## Approach
1. Check if `agentic-embed` exists in `node_modules`
2. If yes: replace local implementation with `export { default } from 'agentic-embed'`
3. If no: submit CR to architecture requesting the package be added

## Acceptance Criteria
- `src/runtime/embed.js` imports from `agentic-embed` package
- OR a CR is filed if package is unavailable
