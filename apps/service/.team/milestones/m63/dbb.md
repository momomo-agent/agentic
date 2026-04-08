# M63 DBB — Architecture Compliance: agentic-sense Package Verification

## DBB-001: agentic-sense in package.json dependencies
- Given: project root package.json
- Expect: `"agentic-sense"` appears under `dependencies`
- Verify: `node -e "const p=require('./package.json'); console.log(p.dependencies['agentic-sense'])"` prints a version string (not undefined)

## DBB-002: sense.js imports from agentic-sense package
- Given: src/runtime/sense.js
- Expect: top-level import is `from 'agentic-sense'`, not a local relative path
- Verify: `grep "from 'agentic-sense'" src/runtime/sense.js` returns a match

## DBB-003: sense.js functions work at runtime
- Given: agentic-sense installed
- Expect: `init`, `start`, `stop`, `detect`, `on` are callable without import errors
- Verify: `node --input-type=module <<< "import * as s from './src/runtime/sense.js'; console.log(typeof s.init)"` prints `function`
