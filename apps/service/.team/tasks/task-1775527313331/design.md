# Design: agentic-embed Package Verification

## Files
- `package.json` — must have `"agentic-embed"` in dependencies
- `src/runtime/embed.js` — must import from `'agentic-embed'`

## Fix if Missing
- Add `"agentic-embed": "*"` to package.json
- Replace local impl:
  ```js
  const { embed } = require('agentic-embed')
  module.exports = { embed }
  ```
