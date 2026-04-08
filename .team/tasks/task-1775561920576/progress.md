# Wire agentic-sense as external package dependency

## Progress

### Changes Made

1. **package.json** - Added import map entry:
   - Added `"#agentic-sense": "./src/runtime/adapters/sense.js"` to imports section

2. **src/runtime/sense.js** - Updated to use adapter import:
   - Changed `import agenticSenseModule from 'agentic-sense'` to `import { createPipeline } from '#agentic-sense'`
   - Removed local `createPipeline` function (now imported from adapter)

### Verification

Ran verification command:
```bash
node --input-type=module <<< "import '#agentic-sense'; console.log('Import successful')"
```
Result: ✓ Import successful

### Status

Task completed successfully. The import map now redirects to the adapter, and sense.js uses the adapter's createPipeline function instead of a local implementation.
