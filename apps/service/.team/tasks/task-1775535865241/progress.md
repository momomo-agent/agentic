# Wire agentic-embed as external package dependency

## Progress

Verified all wiring in place. No code changes needed.
- `src/runtime/embed.js`: imports from `'agentic-embed'` ✓
- `package.json`: `"agentic-embed": "*"` in dependencies ✓
- `package.json`: `"#agentic-embed": "./src/runtime/adapters/embed.js"` import map ✓
