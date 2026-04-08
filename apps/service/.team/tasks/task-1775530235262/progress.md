# Fix package.json imports map: add agentic-sense entry

## Issue Found
The package.json imports field had entries without the `#` prefix, which is required for Node.js subpath imports to work. The verification command in the design (`import('#agentic-sense')`) was failing because the imports map had `"agentic-sense"` instead of `"#agentic-sense"`.

## Changes Made
1. Updated package.json imports field to add `#` prefix to all entries:
   - `"agentic-sense"` → `"#agentic-sense"`
   - `"agentic-embed"` → `"#agentic-embed"`
   - `"agentic-voice/*"` → `"#agentic-voice/*"`

2. Updated src/runtime/sense.js to use the correct import:
   - `from 'agentic-sense'` → `from '#agentic-sense'`

## Verification
✅ `node -e "import('#agentic-sense').then(m => console.log(Object.keys(m)))"` now works and prints `[ 'createPipeline' ]`

## Status
Task complete. The imports map now correctly resolves at runtime.
